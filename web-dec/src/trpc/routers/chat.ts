import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";
import { routeHeuristic, type WidgetInfo } from "../../services/convoRouter";
import { WIDGET_REGISTRY } from "../../services/widgetRegistry";
import { getAttachedContext, recordTurns } from "../../services/honcho";
import { logChatTurns } from "../../services/chatlog";
import {
  ROUTER_SYSTEM,
  routerPrompt,
  RECOMMEND_SYSTEM,
  recommendPrompt,
  type ProbePlan,
} from "./chat.prompts";

// Standalone chat endpoint + conversation router for the /chat view.
//
// What reaches here is either:
//   • a widget result        → recommend a decision, using the original question
//                               (carried from when the widget was surfaced) plus
//                               the widget's formatted output for full context.
//   • a free-text message     → classify it. If it's a decision, choose the most
//                               relevant widget (from the catalog the client
//                               sends) AND extract the choices to prefill it.
//                               Otherwise interpret it using the history.

const HistoryMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

// What the LLM router returns. `widget`/`title` are empty strings (not null) so
// the schema stays strict-mode friendly.
const RouteReplySchema = z.object({
  bubbles: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe(
      "the assistant's reply as 1-3 SHORT chat bubbles, each rendered as its own bubble in the chat. A probing question always gets its OWN bubble.",
    ),
  widget: z
    .string()
    .describe("the `type` of the single most relevant tool to surface, or empty string if none applies"),
  title: z
    .string()
    .describe("a short title for the surfaced tool, derived from the decision, or empty string"),
  question: z
    .string()
    .describe(
      "the decision being worked through, restated as ONE concise self-contained question that folds in the key constraints learned from the conversation (e.g. \"Should I quit my job to start a company, given 8 months of runway?\"), or empty string when no tool applies",
    ),
  items: z
    .array(z.string())
    .describe(
      "the choices/options/tasks to prefill the tool. Either the concrete options the user named, OR — for an open-ended decision where they named none — 3-5 representative options you generate so they get a starting choice grid. Empty array only when no tool applies.",
    ),
  generated: z
    .boolean()
    .describe(
      "true if you invented the items because the user gave no concrete options (open-ended question); false if the items came from what the user actually said",
    ),
});

// What the LLM returns when recommending a decision from a submitted widget.
// Rendered as two bubbles: the headline (large, via markdown heading) then the
// details underneath.
const RecommendationSchema = z.object({
  headline: z
    .string()
    .describe(
      "the conclusion as one short decisive line, 3-8 words — the call itself, e.g. \"Take the Tokyo offer\". No trailing period.",
    ),
  details: z
    .string()
    .describe(
      "2-4 sentences grounding the recommendation in the user's original question and widget input — the one or two key reasons and at most one caveat, no hedging",
    ),
});

// Shape returned to the client.
export interface RouteResult {
  // The assistant's reply, split into chat bubbles — the client renders each
  // string as its own bubble (a probing question gets a bubble to itself).
  bubbles: string[];
  widget: string | null;
  title: string | null;
  // The decision distilled from the whole conversation (incl. answers to the
  // prelude's probing questions) — seeds the widget instead of the raw last
  // message, so e.g. 2×2 axis derivation sees the full picture.
  question: string | null;
  items: string[];
  // True when `items` were generated for an open-ended question (the user named
  // no options), so the UI can present them as editable suggestions.
  generated: boolean;
}

export const chatRouter = router({
  send: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(8000),
        widget: z.object({ type: z.string(), data: z.unknown() }).optional(),
        question: z.string().max(2000).optional(),
        history: z.array(HistoryMessage).optional(),
        // The chat session id — enables Honcho: attached /context documents are
        // folded into routing/recommendations, and each turn is mirrored back.
        sessionId: z.string().min(1).max(200).optional(),
        // Anonymous per-browser id — stamped on chat_logs rows so the admin
        // pages can group a visitor's sessions together.
        userId: z.string().min(1).max(200).optional(),
        // A probing plan for this conversation's question, built by /apply from
        // a review of an earlier conversation about it: the questions to ask
        // (in order) instead of the router's own, plus coaching.
        plan: z
          .object({
            questions: z.array(z.string().max(300)).max(3),
            guidance: z.string().max(2000),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<RouteResult> => {
      if (input.widget) {
        console.log(
          `[chat] received ${input.widget.type} widget:`,
          JSON.stringify(input.widget.data),
        );
      }
      console.log("[chat] received text:", input.text);

      // Best-effort: pull any documents the user attached via /context so both
      // routing and the recommendation are grounded in them.
      const honchoKey = ctx.env.HONCHO_API_KEY;
      const useHoncho = !!(input.sessionId && honchoKey);
      const attached = useHoncho
        ? await getAttachedContext(honchoKey!, input.sessionId!)
        : "";

      // Mirror this turn (user message + assistant reply) into the Honcho
      // session after we have the reply. Best-effort, never blocks the response.
      const mirror = (reply: string) => {
        if (!useHoncho) return;
        ctx.waitUntil(
          recordTurns(honchoKey!, input.sessionId!, [
            { role: "user", content: input.text },
            { role: "assistant", content: reply },
          ]),
        );
      };

      // Append this turn to the Postgres chat_logs table when a DB is configured.
      // Widget submissions carry their structured payload + plain-text rendering
      // in the JSONB `widget` column. Best-effort, after the reply.
      const logDb = (
        reply: string,
        widget?: { type: string; data: unknown; text: string },
      ) => {
        if (!(input.sessionId && ctx.env.DATABASE_URL)) return;
        ctx.waitUntil(
          logChatTurns(
            ctx.db,
            input.sessionId,
            [
              { role: "user", content: input.text, widget: widget ?? null },
              { role: "assistant", content: reply },
            ],
            input.userId,
          ),
        );
      };

      // A widget result → recommend a decision from the original question +
      // the widget's formatted output. No routing.
      if (input.widget) {
        const rec = await recommend(
          ctx.env.OPENROUTER_API_KEY,
          input.question,
          input.widget.type,
          input.text,
          attached,
        );
        // Conclusion bubble (headline, rendered large via markdown heading)
        // followed by a details bubble. The no-key fallback has no headline.
        const bubbles = rec.headline
          ? [`# ${rec.headline}`, rec.details]
          : [rec.details];
        const reply = bubbles.join("\n\n");
        // A submitted widget is the richest signal we get about the user's
        // values for this decision (e.g. the factors they weighted, the options
        // they scored). Persist it to Honcho as an explicit decision record —
        // the decision in play plus their structured input — so Honcho can build
        // a representation of their preferences to recall in later sessions.
        if (useHoncho) {
          const lead = input.question?.trim()
            ? `Decision being weighed: ${input.question.trim()}\n\n`
            : "";
          ctx.waitUntil(
            recordTurns(honchoKey!, input.sessionId!, [
              {
                role: "user",
                content: `${lead}I worked through a "${input.widget.type}" tool and recorded:\n${input.text}`,
              },
              { role: "assistant", content: reply },
            ]),
          );
        }
        logDb(reply, { type: input.widget.type, data: input.widget.data, text: input.text });
        return { bubbles, widget: null, title: null, question: null, items: [], generated: false };
      }

      // First exchange of a new chat (the assistant hasn't spoken yet) → the
      // router opens with probing questions instead of jumping to a widget.
      const firstTurn = !(input.history ?? []).some((m) => m.role === "assistant");
      const result = await route(
        ctx.env.OPENROUTER_API_KEY,
        input.history ?? [],
        input.text,
        WIDGET_REGISTRY,
        attached,
        firstTurn,
        input.plan,
      );
      console.log(
        `[chat] router → ${result.widget ?? "(chat)"}`,
        result.items.length
          ? `items${result.generated ? " (generated)" : ""}: ${JSON.stringify(result.items)}`
          : "",
      );
      // Honcho/Postgres log the bubbles joined back into one assistant turn.
      const replyText = result.bubbles.join("\n\n");
      mirror(replyText);
      logDb(replyText);
      return result;
    }),
});

// Exported so the router eval harness (test/routerEval.ts) can exercise the
// real widget-choosing logic, not a copy.
export async function route(
  apiKey: string | undefined,
  history: { role: "user" | "assistant"; content: string }[],
  text: string,
  catalog: WidgetInfo[],
  attachedContext = "",
  // First message of a new chat → probe before routing (docs/todo/prelude.md):
  // ask a couple of surprising questions about the dilemma, surface the tool on
  // the NEXT turn once the answers are in. The eval harness leaves this false.
  firstTurn = false,
  // /apply's probing plan for this question — replaces the router's own choice
  // of probing questions.
  plan?: ProbePlan,
): Promise<RouteResult> {
  const validTypes = new Set(catalog.map((w) => w.type));

  if (apiKey) {
    try {
      const transcript = history
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n");
      const tools = catalog
        .map((w) => `- ${w.type}: ${w.title} — ${w.purpose}`)
        .join("\n");

      const out = await structuredChat({
        apiKey,
        schema: RouteReplySchema,
        schemaName: "route_reply",
        system: ROUTER_SYSTEM,
        prompt: routerPrompt({ attachedContext, tools, transcript, text, firstTurn, plan }),
        temperature: 0.4,
        title: "convo-router",
      });

      const widget = out.widget && validTypes.has(out.widget) ? out.widget : null;
      const bubbles = out.bubbles.map((b) => b.trim()).filter(Boolean);
      return {
        bubbles: bubbles.length ? bubbles : ["Okay."],
        widget,
        title: widget ? out.title || null : null,
        question: widget ? out.question || null : null,
        items: widget ? out.items : [],
        generated: widget ? out.generated : false,
      };
    } catch (err) {
      console.error("[chat] route failed, using fallback", err);
    }
  }

  // Heuristic fallback (no key / LLM failed).
  const h = routeHeuristic(text, catalog);
  if (h.widget) {
    return {
      bubbles: [`This looks like a decision. Here's the ${h.title} to help.`],
      widget: h.widget,
      title: h.title,
      question: null,
      items: h.items,
      generated: false,
    };
  }
  return {
    bubbles: [
      `Got it — "${text.slice(0, 80)}". Tell me more, or try /factors (decision factors) ` +
        `or /eis (Eisenhower matrix). (Add OPENROUTER_API_KEY for smarter routing.)`,
    ],
    widget: null,
    title: null,
    question: null,
    items: [],
    generated: false,
  };
}

// Turn a submitted widget into a decision recommendation: a short decisive
// headline (the call) plus the supporting details. Uses the original question
// (what the user was deciding) plus the widget's plain-text output so the
// model reasons over the full context, not just the filled-in tool.
async function recommend(
  apiKey: string | undefined,
  question: string | undefined,
  widgetType: string,
  widgetText: string,
  attachedContext = "",
): Promise<{ headline: string; details: string }> {
  if (apiKey) {
    try {
      const out = await structuredChat({
        apiKey,
        schema: RecommendationSchema,
        schemaName: "recommendation",
        system: RECOMMEND_SYSTEM,
        prompt: recommendPrompt({ attachedContext, question, widgetType, widgetText }),
        temperature: 0.4,
        title: "decision-recommend",
      });
      return { headline: out.headline.trim(), details: out.details.trim() };
    } catch (err) {
      console.error("[chat] recommend failed, using fallback", err);
    }
  }

  // No-key / LLM-failed fallback: reflect the input without a tailored call.
  const lead = question?.trim() ? `On "${question.trim()}": ` : "";
  return {
    headline: "",
    details:
      `${lead}thanks — I've captured your ${widgetType} input. ` +
      `Add OPENROUTER_API_KEY for a tailored recommendation.`,
  };
}
