import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the Options A/B widget. Given the user's decision question
// (and, optionally, the two option labels they've already typed), it returns
// two short option labels plus a handful of decision points, each pre-marked
// for which option it favours. The widget calls this from its "Suggest" button.

const RowSchema = z.object({
  text: z.string().describe("a concise decision point / criterion (3-6 words)"),
  a: z.boolean().describe("true if the FIRST option satisfies or is favoured by this point"),
  b: z.boolean().describe("true if the SECOND option satisfies or is favoured by this point"),
});

const SuggestSchema = z.object({
  optionA: z.string().describe("a short label (1-3 words) for the first option"),
  optionB: z.string().describe("a short label (1-3 words) for the second option"),
  rows: z.array(RowSchema).describe("exactly five decision points comparing the two options"),
});

export interface OptionsSuggestion {
  optionA: string;
  optionB: string;
  rows: { text: string; a: boolean; b: boolean }[];
}

export const optionsRouter = router({
  suggest: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        optionA: z.string().max(200).optional(),
        optionB: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<OptionsSuggestion> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      const hintA = input.optionA?.trim();
      const hintB = input.optionB?.trim();
      const haveLabels = hintA && hintB;

      try {
        const out = await structuredChat({
          apiKey,
          schema: SuggestSchema,
          schemaName: "options_suggestion",
          system:
            "You help people choose between exactly two options. You produce the " +
            "decision points that actually distinguish the two choices, and for " +
            "each one you judge which option it favours.",
          prompt:
            `Decision: ${input.question.trim()}\n\n` +
            (haveLabels
              ? `The two options are "${hintA}" (first) and "${hintB}" (second). ` +
                `Use these exact labels.\n\n`
              : `Infer the two options from the decision and give each a short ` +
                `label.\n\n`) +
            `Return exactly five decision points that matter when choosing ` +
            `between the two options (e.g. for "dog or cat": "comfortable ` +
            `indoors", "cost of food", "needs lots of exercise"). For each point, ` +
            `set "a" true if it favours the first option and "b" true if it ` +
            `favours the second. A point can favour both (both true) or neither ` +
            `(both false) when that's the honest answer.`,
          temperature: 0.4,
          title: "options-suggest",
        });

        // Trust the model's labels, but never let a blank one through when the
        // user already supplied one.
        return {
          optionA: out.optionA.trim() || hintA || "Option A",
          optionB: out.optionB.trim() || hintB || "Option B",
          rows: out.rows.map((r) => ({ text: r.text.trim(), a: r.a, b: r.b })),
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[options.suggest] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate suggestions. Please try again.",
        });
      }
    }),
});
