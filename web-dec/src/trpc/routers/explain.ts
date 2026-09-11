import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";
import { AgentStep, formatAgentSteps } from "../../services/agentSteps";

// `/explain` endpoint for the chat view. Explains how the agent answered the
// user's last question: what went into its LLM calls, what came out, and the
// reasoning that connects the two. Without an API key it falls back to raw
// excerpts of the first prompt and last response.

const ExplainSchema = z.object({
  input: z
    .string()
    .describe(
      "2-4 sentences: what the assistant was given for this question — the user's words, any earlier conversation or tool data it drew on, and what its instructions asked it to do",
    ),
  output: z
    .string()
    .describe(
      "2-3 sentences: what it produced — the reply, any tool it chose and the options it extracted, or its recommendation",
    ),
  reasoning: z
    .string()
    .describe(
      "3-5 sentences: why that input led to that output — the cues it keyed on, how its instructions shaped the choice, and any assumptions it made",
    ),
  steps: z
    .array(z.string())
    .max(6)
    .describe("one short line per internal call, in order, saying what that call did"),
});

export type ExplainResult = z.infer<typeof ExplainSchema> & { generated: boolean };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export const explainRouter = router({
  run: publicProcedure
    .input(
      z.object({
        question: z.string().max(4000),
        steps: z.array(AgentStep).max(10),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<ExplainResult> => {
      const { steps } = input;
      if (steps.length === 0) {
        return {
          input: input.question,
          output: "The reply shown in the chat.",
          reasoning:
            "No LLM calls were recorded for this question, so the reply came from ViziThink's " +
            "built-in fallback logic (keyword matching), not a model.",
          steps: [],
          generated: false,
        };
      }

      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return {
          input: clip(steps[0].prompt, 600),
          output: clip(steps[steps.length - 1].response ?? "(none)", 600),
          reasoning:
            "Set OPENROUTER_API_KEY in .dev.vars to have the reasoning explained. The full " +
            "prompts and responses are in the 🧠 prompts sidebar.",
          steps: steps.map((s) => s.title ?? s.path),
          generated: false,
        };
      }

      try {
        const out = await structuredChat({
          apiKey,
          schema: ExplainSchema,
          schemaName: "explanation",
          system:
            "You explain how ViziThink, an AI decision assistant, answered a user's question. " +
            "You get the question and the internal LLM calls it made (prompt and raw response " +
            "for each). Explain plainly, for the user, what the assistant was given, what it " +
            "produced, and the reasoning that connects the two — point at the specific parts of " +
            "the prompt and instructions that drove each choice. Be concrete and faithful to the " +
            "trace; don't speculate beyond it. Second person for the user ('you asked…'), third " +
            "person for the assistant. No preamble.",
          prompt:
            `The user's question:\n${input.question}\n\n` +
            `Internal calls (oldest first):\n${formatAgentSteps(steps)}\n\n` +
            `Write the explanation.`,
          temperature: 0.2,
          title: "explain",
        });
        return { ...out, generated: true };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[explain.run] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not explain the last answer. Please try again.",
        });
      }
    }),
});
