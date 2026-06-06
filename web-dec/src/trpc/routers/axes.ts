import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the 2×2 axes/scatter widget. Given a decision and the options
// being compared (e.g. "should I buy a car or a motorbike", ["car", "motorbike"]),
// it derives the TWO axes most useful for comparing them — each with a label and
// its two poles (the meaning at 0 and at 100). The user then drags each option
// onto the plane and the position becomes a 0-100 score per axis. The widget
// calls this from its "suggest axes" button (and once on mount when routed in).

const AxisSchema = z.object({
  label: z
    .string()
    .describe("the axis name — a single dimension to compare on, 1-3 words, e.g. 'Cost', 'Safety'"),
  low: z
    .string()
    .describe("what the LOW end (score 0) of this axis means, 1-2 words, e.g. 'Cheap', 'Risky'"),
  high: z
    .string()
    .describe("what the HIGH end (score 100) of this axis means, 1-2 words, e.g. 'Expensive', 'Safe'"),
});

const AxesSchema = z.object({
  xAxis: AxisSchema.describe("the horizontal axis"),
  yAxis: AxisSchema.describe("the vertical axis — must be a DIFFERENT dimension from xAxis"),
});

export interface AxesSuggestion {
  xAxis: { label: string; low: string; high: string };
  yAxis: { label: string; low: string; high: string };
}

export const axesRouter = router({
  suggest: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        items: z.array(z.string().max(200)).max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<AxesSuggestion> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      const items = (input.items ?? []).map((s) => s.trim()).filter(Boolean);

      try {
        const out = await structuredChat({
          apiKey,
          schema: AxesSchema,
          schemaName: "axes_suggestion",
          system:
            "You help people compare options visually on a 2×2 plane. Given a " +
            "decision and the options being compared, pick the TWO most decision-" +
            "relevant, INDEPENDENT dimensions to plot them on. Name each axis and " +
            "its two poles concretely. The poles must be opposites and oriented so " +
            "low = 0 and high = 100.",
          prompt:
            `Decision: ${input.question.trim()}\n` +
            (items.length ? `Options to compare: ${items.join(", ")}\n\n` : "\n") +
            `Pick two distinct axes that best separate these options (e.g. for ` +
            `"car or motorbike": x = Cost (low "Cheap" → high "Expensive"), ` +
            `y = Safety (low "Risky" → high "Safe")). Keep labels 1-3 words and ` +
            `poles 1-2 words.`,
          temperature: 0.4,
          title: "axes-suggest",
        });

        return { xAxis: out.xAxis, yAxis: out.yAxis };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[axes.suggest] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate axes. Please try again.",
        });
      }
    }),
});
