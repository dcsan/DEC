import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the Decision tree widget. Given the decision, it drafts a
// root and a set of conditional branches (condition → outcome, with an optional
// probability/note). Used both to prefill a freshly-surfaced tree and to append
// more branches via the widget's "✨ add more" button — pass the branch
// conditions already on screen as `existing` so the model returns fresh forks.

const BranchSchema = z.object({
  condition: z.string().describe("the fork / condition, e.g. 'Funding round closes'"),
  outcome: z.string().describe("what happens on this branch — the next step or result"),
  probability: z.string().describe("a rough probability or short note, or empty string"),
});

const TreeSchema = z.object({
  root: z.string().describe("the starting decision or question at the root of the tree"),
  branches: z.array(BranchSchema).describe("the conditional branches forking from the root"),
});

export interface TreeSuggestion {
  root: string;
  branches: { condition: string; outcome: string; probability: string }[];
}

export const treeRouter = router({
  suggest: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        // Branch conditions already on screen, so "add more" returns new forks.
        existing: z.array(z.string().max(400)).max(50).optional(),
        count: z.number().int().min(1).max(8).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<TreeSuggestion> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      const n = input.count ?? 3;
      const existing = (input.existing ?? []).map((s) => s.trim()).filter(Boolean);

      try {
        const out = await structuredChat({
          apiKey,
          schema: TreeSchema,
          schemaName: "tree_suggestion",
          system:
            "You map decisions into a decision tree: a root decision and the " +
            "conditional branches that fork from it. Each branch is a plausible " +
            "condition and the outcome / next step it leads to.",
          prompt:
            `Decision: ${input.question.trim()}\n\n` +
            (existing.length
              ? `Branches already on screen (do NOT repeat these):\n${existing
                  .map((e) => `- ${e}`)
                  .join("\n")}\n\n`
              : "") +
            `Restate the decision as a short root, then give ${n} conditional ` +
            `branches that fork from it${
              existing.length ? ", genuinely different from the ones above" : ""
            }. For each branch: a condition/fork, the outcome or next step it ` +
            `leads to, and an optional rough probability or note (use "" if none).`,
          temperature: 0.6,
          title: "tree-suggest",
        });

        // Defend against blanks and against branches duplicating the existing
        // conditions (the model occasionally echoes them back).
        const seen = new Set(existing.map((e) => e.toLowerCase()));
        const branches: TreeSuggestion["branches"] = [];
        for (const b of out.branches) {
          const condition = b.condition.trim();
          const outcome = b.outcome.trim();
          if (!condition && !outcome) continue;
          if (condition && seen.has(condition.toLowerCase())) continue;
          if (condition) seen.add(condition.toLowerCase());
          branches.push({ condition, outcome, probability: b.probability.trim() });
        }
        return { root: out.root.trim(), branches };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[tree.suggest] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate branches. Please try again.",
        });
      }
    }),
});
