import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";
import { routeHeuristic, type WidgetInfo } from "../../services/convoRouter";
import { WIDGET_REGISTRY } from "../../services/widgetRegistry";

// Standalone chat endpoint + conversation router for the /chat view.
//
// What reaches here is either:
//   • a widget result        → acknowledge it, no routing, and
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
        history: z.array(HistoryMessage).optional(),
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

      // A widget result → simple acknowledgement, no routing.
      if (input.widget) {
        return { reply: `you said: ${input.text}`, widget: null, title: null, items: [] };
      }

      const result = await route(
        ctx.env.OPENROUTER_API_KEY,
        input.history ?? [],
        input.text,
        WIDGET_REGISTRY,
      );
      console.log(
        `[chat] router → ${result.widget ?? "(chat)"}`,
        result.items.length ? `items: ${JSON.stringify(result.items)}` : "",
      );
      return result;
    }),
});

async function route(
  apiKey: string | undefined,
  history: { role: "user" | "assistant"; content: string }[],
  text: string,
  catalog: WidgetInfo[],
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
      `Got it — "${text.slice(0, 80)}". Tell me more, or try /pc (pros & cons) ` +
      `or /eis (Eisenhower matrix). (Add OPENROUTER_API_KEY for smarter routing.)`,
    widget: null,
    title: null,
    items: [],
  };
}
