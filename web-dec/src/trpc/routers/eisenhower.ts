import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the Eisenhower matrix widget. Given the decision/context and
// a set of tasks sitting in the pool, it classifies each on the two Eisenhower
// axes — important (matters for goals/values) and urgent (time-sensitive) — so
// the widget can auto-place them into the Do / Schedule / Delegate / Drop
// quadrants instead of the user dragging each one. No key → PRECONDITION_FAILED.

const CategorizeSchema = z.object({
  items: z
    .array(
      z.object({
        text: z.string().describe("the task, copied exactly from the input"),
        important: z
          .boolean()
          .describe("true if it meaningfully advances the person's goals or values"),
        urgent: z
          .boolean()
          .describe("true if it is time-sensitive and needs attention very soon"),
      }),
    )
    .describe("one classification per input task, same texts"),
});

export interface CategorizedTask {
  text: string;
  important: boolean;
  urgent: boolean;
}

export const eisenhowerRouter = router({
  categorize: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        items: z.array(z.string().min(1).max(400)).min(1).max(40),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ items: CategorizedTask[] }> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Auto-categorise needs an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      const items = input.items.map((s) => s.trim()).filter(Boolean);

      try {
        const out = await structuredChat({
          apiKey,
          schema: CategorizeSchema,
          schemaName: "eisenhower_categorize",
          system:
            "You sort tasks on the Eisenhower matrix's two axes. IMPORTANT means " +
            "the task meaningfully advances long-term goals or values. URGENT means " +
            "it is time-sensitive and needs attention very soon. Judge the two " +
            "independently for each task. Return a classification for EVERY task, " +
            "copying each text exactly.",
          prompt:
            `Context: ${input.question.trim()}\n\n` +
            `Tasks to classify:\n${items.map((t) => `- ${t}`).join("\n")}\n\n` +
            `For each task decide important (true/false) and urgent (true/false).`,
          temperature: 0.3,
          title: "eisenhower-categorize",
        });

        return { items: out.items };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[eisenhower.categorize] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not categorise the tasks. Please try again.",
        });
      }
    }),
});
