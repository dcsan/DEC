import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the Factor Weighting widget. Given a yes/no decision question
// (e.g. "should I join a startup?"), it returns the factors that bear on it —
// both those that pull toward yes and those that pull toward no. The user ranks
// how much each matters, so the model only names them (it does not weight them).
// The widget calls this from its "Suggest" button (and once on mount when routed
// in with a question).

const SuggestSchema = z.object({
  factors: z
    .array(
      z
        .string()
        .describe(
          "a concise factor that bears on the decision (2-6 words), named neutrally rather than phrased as a pro or con, e.g. 'Freedom from corporate life', 'Equity upside', 'Steady paycheck', 'Job security'",
        ),
    )
    .describe(
      "five to seven factors that genuinely pull on this decision, mixing ones that argue for it and ones that argue against it",
    ),
});

export interface FactorsSuggestion {
  factors: string[];
}

export const factorsRouter = router({
  suggest: publicProcedure
    .input(z.object({ question: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }): Promise<FactorsSuggestion> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      try {
        const out = await structuredChat({
          apiKey,
          schema: SuggestSchema,
          schemaName: "factors_suggestion",
          system:
            "You help people make a single yes/no, go/no-go decision by surfacing " +
            "the factors that genuinely bear on it. Name the factors neutrally — " +
            "both the ones that argue for the decision and the ones that argue " +
            "against it. The user will rank how much each one matters to them, so " +
            "do not weight or rank them yourself.",
          prompt:
            `Decision: ${input.question.trim()}\n\n` +
            `Return five to seven factors that genuinely pull on this decision, ` +
            `mixing ones that argue for it and ones that argue against it (e.g. for ` +
            `"should I join a startup?": "Freedom from corporate life", "Equity ` +
            `upside", "Steady paycheck", "Job security", "Risk tolerance", "Learning ` +
            `and growth"). Name each factor in 2-6 words, neutrally — not as a pro ` +
            `or con.`,
          temperature: 0.5,
          title: "factors-suggest",
        });

        return {
          factors: out.factors.map((f) => f.trim()).filter((f) => f !== ""),
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[factors.suggest] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate factors. Please try again.",
        });
      }
    }),
});
