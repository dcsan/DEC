import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the Pre-mortem widget. Given the decision, it drafts the four
// fields of a pre-mortem: a crisp statement of the decision, a time horizon, a
// vivid imagined failure at that horizon, and the chain of causes working
// backwards from it. Used to prefill a freshly-surfaced pre-mortem.

const PremortemSchema = z.object({
  decision: z.string().describe("a crisp one-line statement of what's being decided/done"),
  horizon: z.string().describe("a time horizon for the imagined failure, e.g. '12 months from now'"),
  imaginedFailure: z
    .string()
    .describe("assume it has failed at the horizon — vividly describe what went wrong (1-3 sentences)"),
  causes: z
    .string()
    .describe("the chain of causes working backwards from that failure (a few lines or bullets)"),
});

export interface PremortemSuggestion {
  decision: string;
  horizon: string;
  imaginedFailure: string;
  causes: string;
}

export const premortemRouter = router({
  suggest: publicProcedure
    .input(z.object({ question: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }): Promise<PremortemSuggestion> => {
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
          schema: PremortemSchema,
          schemaName: "premortem_suggestion",
          system:
            "You run pre-mortems: you assume a decision has already failed and " +
            "work backwards to surface the failure modes before they happen. Be " +
            "concrete and specific to the decision at hand.",
          prompt:
            `Decision: ${input.question.trim()}\n\n` +
            `Draft a pre-mortem for this decision. Give a crisp one-line ` +
            `restatement of the decision, a sensible time horizon, a vivid ` +
            `imagined failure at that horizon (assume it went wrong), and the ` +
            `chain of causes that led there, working backwards.`,
          temperature: 0.6,
          title: "premortem-suggest",
        });

        return {
          decision: out.decision.trim(),
          horizon: out.horizon.trim(),
          imaginedFailure: out.imaginedFailure.trim(),
          causes: out.causes.trim(),
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[premortem.suggest] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate the pre-mortem. Please try again.",
        });
      }
    }),
});
