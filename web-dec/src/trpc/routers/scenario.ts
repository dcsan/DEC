import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the Scenario planning widget. Given the decision, it drafts a
// spread of plausible futures (best case → worst case), each with its
// implications and a rough likelihood (percent). Used to prefill a freshly
// surfaced scenario widget; the chances feed its Sankey chart.

const ScenarioRowSchema = z.object({
  name: z.string().describe("a short name for this future, e.g. 'Thriving freelancer'"),
  implications: z.string().describe("what this future would mean for the person (1-2 sentences)"),
  chance: z.string().describe("rough likelihood as a percent number with no % sign, e.g. '30'"),
});

const ScenarioSchema = z.object({
  scenarios: z
    .array(ScenarioRowSchema)
    .describe("distinct plausible futures spanning best case to worst case; chances sum to ~100"),
});

export interface ScenarioSuggestion {
  scenarios: { name: string; implications: string; chance: string }[];
}

export const scenarioRouter = router({
  suggest: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        count: z.number().int().min(2).max(6).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<ScenarioSuggestion> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      const n = input.count ?? 3;
      try {
        const out = await structuredChat({
          apiKey,
          schema: ScenarioSchema,
          schemaName: "scenario_suggestion",
          system:
            "You do scenario planning: you map a decision into a spread of " +
            "plausible futures, from best case to worst case, each with its " +
            "implications and a rough likelihood.",
          prompt:
            `Decision: ${input.question.trim()}\n\n` +
            `Sketch ${n} distinct plausible futures for this decision, spanning ` +
            `best case to worst case. For each: a short name, the implications it ` +
            `would have, and a rough likelihood as a percent number (no % sign). ` +
            `Make the chances roughly sum to 100.`,
          temperature: 0.6,
          title: "scenario-suggest",
        });

        const scenarios = out.scenarios
          .map((s) => ({
            name: s.name.trim(),
            implications: s.implications.trim(),
            chance: s.chance.trim().replace("%", ""),
          }))
          .filter((s) => s.name || s.implications);
        return { scenarios };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[scenario.suggest] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate scenarios. Please try again.",
        });
      }
    }),
});
