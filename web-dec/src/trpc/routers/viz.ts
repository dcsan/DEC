import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// `/viz` endpoint for the chat view. Given the conversation so far and the
// decision in play, it asks the LLM to draft a single self-contained SVG
// "system diagram" of the considerations and the choice — funnels, cycles,
// grids/quadrants, boxes-and-arrows — which the client injects into the page.
// The SVG is sanitised client-side before rendering.

const HistoryMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const VizSchema = z.object({
  title: z.string().describe("a short title for the diagram (a few words)"),
  svg: z
    .string()
    .describe(
      "a COMPLETE, self-contained SVG document starting with <svg and ending with </svg>. " +
        "Must set a viewBox (e.g. '0 0 640 420') and width='100%' height='auto'. Use only " +
        "presentation elements: rect, circle, ellipse, line, polyline, polygon, path, text, g. " +
        "NO <script>, NO <foreignObject>, NO <image>, NO external refs, NO on* event attributes.",
    ),
});

export interface VizResult {
  title: string;
  svg: string;
}

export const vizRouter = router({
  run: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        history: z.array(HistoryMessage).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<VizResult> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Visualising needs an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable /viz.",
        });
      }

      const transcript = (input.history ?? [])
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n");

      console.log("[viz] decision:", input.question);

      try {
        const out = await structuredChat({
          apiKey,
          schema: VizSchema,
          schemaName: "viz",
          system:
            "You are ViziThink's diagram designer. Turn a decision and its considerations into ONE " +
            "clean, schematic SVG 'system diagram' — clip-art / PowerPoint-style, not a chart of " +
            "real data. Choose the layout that fits the meaning: a funnel or triangle for " +
            "segments/stages, a cycle of arrows for things that depend on each other, a 2x2 grid " +
            "or quadrants for categorisation, or labelled boxes joined by arrows for options and " +
            "consequences. Keep it legible: short text labels, generous spacing, 6-12 elements. " +
            "Design for a DARK background: use light strokes/text (#e5e7eb), a transparent or no " +
            "background, and one or two accent colours (e.g. #6ea8fe, #7ee2b8, #ff8b8b). Output " +
            "ONLY valid SVG in the svg field — no markdown fences, no <script>, no <foreignObject>.",
          prompt:
            `Conversation so far:\n${transcript || "(none)"}\n\n` +
            `The decision to visualise: ${input.question.trim()}\n\n` +
            `Draft the diagram that best captures the considerations and the choice.`,
          temperature: 0.6,
          title: "viz",
          timeoutMs: 45_000,
        });

        return { title: out.title, svg: out.svg };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[viz.run] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate a diagram. Please try again.",
        });
      }
    }),
});
