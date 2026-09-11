import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";
import { AgentStep, formatAgentSteps } from "../../services/agentSteps";

// `/reflect` endpoint for the chat view. A retrospective on the session: first
// judge how good the proposed solution is given the information the user
// actually provided, then review the agent's own process (the LLM calls it made
// — routing, probing, widget choice, recommendation) and propose how that
// process should change to reach a better answer, in hindsight of everything
// known by the end of the conversation.

const ReflectSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("how good the proposed solution is given the information the user provided, 1 (poor) to 10 (excellent)"),
  verdict: z.string().describe("one sentence: the overall judgement of the proposed solution"),
  solutionReview: z
    .string()
    .describe(
      "2-4 sentences: what the solution got right and wrong relative to what the user actually said — anything it ignored, assumed, or over-reached on, and any information that was missing",
    ),
  processReview: z
    .string()
    .describe(
      "2-4 sentences reviewing the agent's thinking process step by step — how it classified, probed, picked a tool and reached its answer — and where that process went wrong or was weak",
    ),
  improvements: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("2-5 concrete changes to the agent's process (what to ask, when, which tool, what to weigh) that would have reached a better solution sooner"),
  betterSolution: z
    .string()
    .describe("2-3 sentences: knowing everything now known, what a better answer to the user would be"),
});

export type ReflectResult = z.infer<typeof ReflectSchema>;

export const reflectRouter = router({
  run: publicProcedure
    .input(
      z.object({
        transcript: z.string().max(40000),
        steps: z.array(AgentStep).max(30).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<ReflectResult | { empty: string }> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Reflection needs an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable /reflect.",
        });
      }

      if (!input.transcript.trim()) {
        return { empty: "There's nothing to reflect on yet — ask me about a decision first." };
      }

      const steps = formatAgentSteps(input.steps ?? []);

      try {
        return await structuredChat({
          apiKey,
          schema: ReflectSchema,
          schemaName: "reflection",
          system:
            "You are reviewing the work of ViziThink, an AI decision assistant, as a candid senior " +
            "reviewer. You get the full conversation and the internal LLM calls the assistant made " +
            "to produce it. First judge the proposed solution strictly against the information the " +
            "user actually provided — reward answers grounded in what they said, penalise " +
            "assumptions, generic advice and ignored details. Then review the thinking process " +
            "that led there and, using hindsight of everything known by the end of the " +
            "conversation, say how the process should change to reach a better solution. Be " +
            "specific and concrete; no flattery, no preamble.",
          prompt:
            `Conversation:\n${input.transcript}\n\n` +
            `Assistant's internal steps (oldest first):\n${steps || "(no trace available — infer the process from the conversation)"}\n\n` +
            `Write the reflection.`,
          temperature: 0.3,
          title: "reflect",
        });
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[reflect.run] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not reflect on this conversation. Please try again.",
        });
      }
    }),
});
