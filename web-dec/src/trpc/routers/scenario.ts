import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the Scenario planning widget. Given the decision, it drafts a
// branching TREE of plausible futures: top-level futures that fan out into
// follow-on events (a → b → c). Each node has a rough likelihood (relative to
// its siblings) and an outcome tag — good / bad / neutral — so each path tells a
// story that ends well or badly. Used to prefill a freshly surfaced widget.

const OutcomeSchema = z
  .enum(["good", "bad", "neutral"])
  .describe("whether landing on this branch is a good, bad, or neutral outcome");

// JSON Schema (strict mode) can't express recursion, so depth is fixed
// explicitly: future → consequence → follow-on (3 levels). That's plenty for a
// readable tree and keeps the structured-output contract simple.
const LeafSchema = z.object({
  name: z.string().describe("a short name for this follow-on event"),
  chance: z.string().describe("rough likelihood among its siblings as a percent number, no % sign"),
  outcome: OutcomeSchema,
});
const MidSchema = z.object({
  name: z.string().describe("a short name for this consequence"),
  chance: z.string().describe("rough likelihood among its siblings as a percent number, no % sign"),
  outcome: OutcomeSchema,
  children: z.array(LeafSchema).describe("follow-on events this consequence leads to (may be empty)"),
});
const TopSchema = z.object({
  name: z.string().describe("a short name for this top-level future, e.g. 'Thriving freelancer'"),
  chance: z.string().describe("rough likelihood among the top-level futures as a percent number, no % sign"),
  outcome: OutcomeSchema,
  children: z.array(MidSchema).describe("consequences this future branches into (may be empty)"),
});
const ScenarioSchema = z.object({
  scenarios: z
    .array(TopSchema)
    .describe("distinct top-level futures spanning best case to worst case; their chances sum to ~100"),
});

// Recursive shape returned to the client (no ids — the widget assigns them).
export interface ScenarioNodeSuggestion {
  name: string;
  chance: string;
  outcome: "good" | "bad" | "neutral";
  children: ScenarioNodeSuggestion[];
}

export interface ScenarioSuggestion {
  scenarios: ScenarioNodeSuggestion[];
}

// Normalise one node: trim text, strip a stray "%" from chance, recurse.
function clean(n: {
  name: string;
  chance: string;
  outcome: "good" | "bad" | "neutral";
  children?: { name: string; chance: string; outcome: "good" | "bad" | "neutral"; children?: unknown[] }[];
}): ScenarioNodeSuggestion {
  return {
    name: n.name.trim(),
    chance: n.chance.trim().replace("%", ""),
    outcome: n.outcome,
    children: (n.children ?? []).map((c) => clean(c as Parameters<typeof clean>[0])),
  };
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
            "You do scenario planning: you map a decision into a branching tree of " +
            "plausible futures, from best case to worst case. Each top-level future " +
            "fans out into the consequences and follow-on events it would trigger, " +
            "and every branch is tagged as a good, bad, or neutral outcome.",
          prompt:
            `Decision: ${input.question.trim()}\n\n` +
            `Map ${n} distinct top-level futures for this decision, spanning best ` +
            `case to worst case. For EACH future, branch it into 1-3 consequences, ` +
            `and branch the most important consequences once more into follow-on ` +
            `events — so paths read as a → b → c. Give every node a short name, a ` +
            `rough likelihood relative to its siblings (percent number, no % sign), ` +
            `and an outcome tag (good / bad / neutral). Make the top-level chances ` +
            `roughly sum to 100.`,
          temperature: 0.6,
          title: "scenario-suggest",
        });

        const scenarios = out.scenarios.map(clean).filter((s) => s.name || s.children.length);
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
