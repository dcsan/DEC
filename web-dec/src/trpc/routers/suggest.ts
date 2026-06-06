import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// Generic "generate more" endpoint, shared by any widget that holds a list of
// short text items (Decision Factors, Cost–Benefit lines, Scenarios, Eisenhower
// tasks, …). Given the decision question, what one item means for that widget,
// and the items already on screen, it returns a handful of NEW, distinct items
// to append. The widget maps the strings into its own row shape.

export interface MoreItems {
  items: string[];
}

export const suggestRouter = router({
  more: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        // What one item is, in the widget's terms (e.g. "pro or con
        // consideration", "decision point", "factor that matters").
        itemNoun: z.string().max(80).optional(),
        // Item texts already present, so the model doesn't repeat them.
        existing: z.array(z.string().max(400)).max(50).optional(),
        count: z.number().int().min(1).max(8).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<MoreItems> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      const n = input.count ?? 4;
      const noun = input.itemNoun?.trim() || "consideration";
      const existing = (input.existing ?? []).map((s) => s.trim()).filter(Boolean);

      const schema = z.object({
        items: z
          .array(z.string().describe(`a concise ${noun} (3-8 words)`))
          .describe(`${n} new, distinct ${noun}s not already listed`),
      });

      try {
        const out = await structuredChat({
          apiKey,
          schema,
          schemaName: "more_items",
          system:
            "You help people flesh out a decision by suggesting more of the items " +
            "they're listing. Return only new, distinct, concrete items — never " +
            "repeat or rephrase ones already present.",
          prompt:
            `Decision: ${input.question.trim()}\n\n` +
            (existing.length
              ? `Items already listed:\n${existing.map((e) => `- ${e}`).join("\n")}\n\n`
              : "") +
            `Suggest ${n} more ${noun}s that are genuinely different from the ones ` +
            `above and relevant to this decision. Keep each to 3-8 words.`,
          temperature: 0.7,
          title: "suggest-more",
        });

        // Trust the model but defend against blanks and near-duplicates.
        const seen = new Set(existing.map((e) => e.toLowerCase()));
        const items: string[] = [];
        for (const raw of out.items) {
          const t = raw.trim();
          if (!t || seen.has(t.toLowerCase())) continue;
          seen.add(t.toLowerCase());
          items.push(t);
        }
        return { items };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[suggest.more] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate more items. Please try again.",
        });
      }
    }),
});
