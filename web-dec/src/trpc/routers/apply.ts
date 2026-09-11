import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";
import { AgentStep, formatAgentSteps } from "../../services/agentSteps";

// `/apply` endpoint for the chat view. Turns a review of the conversation about
// one specific question (the transcript, the agent's internal steps, and the
// latest /reflect critique when there is one) into a better *probing plan* for
// that question: the questions the convo router should ask the user, in order,
// plus coaching on what to listen for. The client stores the plan per question
// and sends it with chat.send whenever that question is asked again.

const ProbePlanSchema = z.object({
  questions: z
    .array(z.string())
    .min(1)
    .max(2)
    .describe(
      "the 1-2 probing questions to ask the user about THIS decision, in order, before surfacing a tool — each under 15 words, one idea each, chosen to uncover early what the earlier conversation missed or had to assume",
    ),
  guidance: z
    .string()
    .describe(
      "1-3 sentences of coaching for the assistant on this question: what to listen for in the answers, what not to assume, and what to weigh when choosing the tool and its options",
    ),
  rationale: z
    .string()
    .describe("1-2 sentences, addressed to the user: why these questions will lead to a better answer than the ones asked before"),
});

export type ProbePlanResult = z.infer<typeof ProbePlanSchema>;

export const applyRouter = router({
  run: publicProcedure
    .input(
      z.object({
        // The session's opening question — the decision the plan is for.
        question: z.string().min(1).max(2000),
        transcript: z.string().max(40000),
        // The last /reflect output, when the user ran one.
        reflection: z.string().max(8000).optional(),
        steps: z.array(AgentStep).max(30).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<ProbePlanResult> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Applying improvements needs an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable /apply.",
        });
      }

      try {
        return await structuredChat({
          apiKey,
          schema: ProbePlanSchema,
          schemaName: "probe_plan",
          system:
            "You improve how ViziThink, an AI decision assistant, opens a conversation about one " +
            "specific decision. Before it surfaces a thinking tool it asks the user at most two short " +
            "probing questions, one per turn. You get the user's question, the conversation that " +
            "followed, the assistant's internal steps and, when available, a critique of that " +
            "conversation. Design the probing questions it should ask next time this exact question " +
            "comes up, so it learns early what the final answer actually hinged on — the facts it " +
            "was missing, assumed, or only discovered late. Questions must be specific to this " +
            "decision, not generic ('what matters most to you?'). No preamble.",
          prompt:
            `The question: ${input.question}\n\n` +
            `Conversation:\n${input.transcript || "(none)"}\n\n` +
            (input.reflection ? `Critique of that conversation:\n${input.reflection}\n\n` : "") +
            `Assistant's internal steps (oldest first):\n${formatAgentSteps(input.steps ?? []) || "(none)"}\n\n` +
            `Write the improved probing plan for this question.`,
          temperature: 0.3,
          title: "apply",
        });
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[apply.run] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not build improved questions. Please try again.",
        });
      }
    }),
});
