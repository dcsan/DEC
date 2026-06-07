import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";
import { routeHeuristic, type WidgetInfo } from "../../services/convoRouter";
import { WIDGET_REGISTRY } from "../../services/widgetRegistry";
import { getAttachedContext, recordTurns } from "../../services/honcho";
import { logChatTurns } from "../../services/chatlog";

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
  reply: z.string().describe("a brief, friendly reply to the user's latest message"),
  widget: z
    .string()
    .describe("the `type` of the single most relevant tool to surface, or empty string if none applies"),
  title: z
    .string()
    .describe("a short title for the surfaced tool, derived from the decision, or empty string"),
  items: z
    .array(z.string())
    .describe("the choices/options/tasks from the conversation to prefill the tool, or an empty array"),
});

// What the LLM returns when recommending a decision from a submitted widget.
const RecommendationSchema = z.object({
  recommendation: z
    .string()
    .describe(
      "a concise, decisive recommendation grounded in the user's original question and their widget input — state what to do and the key reason, 2-4 sentences, no hedging",
    ),
});

// Shape returned to the client.
export interface RouteResult {
  reply: string;
  widget: string | null;
  title: string | null;
  items: string[];
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
          logChatTurns(ctx.db, input.sessionId, [
            { role: "user", content: input.text, widget: widget ?? null },
            { role: "assistant", content: reply },
          ]),
        );
      };

      // A widget result → recommend a decision from the original question +
      // the widget's formatted output. No routing.
      if (input.widget) {
        const reply = await recommend(
          ctx.env.OPENROUTER_API_KEY,
          input.question,
          input.widget.type,
          input.text,
          attached,
        );
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
        return { reply, widget: null, title: null, items: [] };
      }

      const result = await route(
        ctx.env.OPENROUTER_API_KEY,
        input.history ?? [],
        input.text,
        WIDGET_REGISTRY,
        attached,
      );
      console.log(
        `[chat] router → ${result.widget ?? "(chat)"}`,
        result.items.length ? `items: ${JSON.stringify(result.items)}` : "",
      );
      mirror(result.reply);
      logDb(result.reply);
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
        system:
          "You are DEC, a concise decision assistant that routes the user to the " +
          "right thinking tool. Match the user's intent to a tool's purpose.",
        prompt:
          (attachedContext
            ? `Context the user attached (weigh this when interpreting them):\n${attachedContext}\n\n`
            : "") +
          `Available tools (widgets):\n${tools || "(none)"}\n\n` +
          `Conversation so far:\n${transcript || "(none)"}\n\n` +
          `Latest user message: ${text}\n\n` +
          `If this is a decision, prioritisation, or choice that one of the tools ` +
          `would help with, set "widget" to that tool's exact type, set "title" to a ` +
          `short title for the decision, and set "items" to the concrete choices, ` +
          `options, or tasks mentioned (e.g. "buy a house or buy a car" → ` +
          `["Buy a house", "Buy a car"]). If the user only states an intent with no ` +
          `concrete items yet, return an empty items array. Otherwise set "widget" ` +
          `and "title" to "" and reply helpfully in context.`,
        temperature: 0.3,
        title: "convo-router",
      });

      const widget = out.widget && validTypes.has(out.widget) ? out.widget : null;
      return {
        reply: out.reply,
        widget,
        title: widget ? out.title || null : null,
        items: widget ? out.items : [],
      };
    } catch (err) {
      console.error("[chat] route failed, using fallback", err);
    }
  }

  // Heuristic fallback (no key / LLM failed).
  const h = routeHeuristic(text, catalog);
  if (h.widget) {
    return {
      reply: `This looks like a decision. Here's the ${h.title} to help.`,
      widget: h.widget,
      title: h.title,
      items: h.items,
    };
  }
  return {
    reply:
      `Got it — "${text.slice(0, 80)}". Tell me more, or try /rc (decision factors) ` +
      `or /eis (Eisenhower matrix). (Add OPENROUTER_API_KEY for smarter routing.)`,
    widget: null,
    title: null,
    items: [],
  };
}

// Turn a submitted widget into a decision recommendation. Uses the original
// question (what the user was deciding) plus the widget's plain-text output so
// the model reasons over the full context, not just the filled-in tool.
async function recommend(
  apiKey: string | undefined,
  question: string | undefined,
  widgetType: string,
  widgetText: string,
  attachedContext = "",
): Promise<string> {
  if (apiKey) {
    try {
      const out = await structuredChat({
        apiKey,
        schema: RecommendationSchema,
        schemaName: "recommendation",
        system:
          "You are DEC, a decisive decision assistant. The user worked through a " +
          "thinking tool and submitted it. Using their original question and the " +
          "filled-in tool, give a clear recommendation: say what you'd do and the " +
          "one or two reasons why. Be concise and don't hedge.",
        prompt:
          (attachedContext
            ? `Context the user attached (weigh this heavily):\n${attachedContext}\n\n`
            : "") +
          `Original decision: ${question?.trim() || "(not stated — infer from the tool)"}\n\n` +
          `The user worked through it with the "${widgetType}" tool and submitted:\n` +
          `${widgetText}\n\n` +
          `Give your recommendation.`,
        temperature: 0.4,
        title: "decision-recommend",
      });
      return out.recommendation;
    } catch (err) {
      console.error("[chat] recommend failed, using fallback", err);
    }
  }

  // No-key / LLM-failed fallback: reflect the input without a tailored call.
  const lead = question?.trim() ? `On "${question.trim()}": ` : "";
  return (
    `${lead}thanks — I've captured your ${widgetType} input. ` +
    `Add OPENROUTER_API_KEY for a tailored recommendation.`
  );
}
