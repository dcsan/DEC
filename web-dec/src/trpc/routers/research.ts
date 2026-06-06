import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// `/research` endpoint for the chat view. Given the conversation so far and the
// decision the user is wrestling with, it runs a *web-augmented* LLM call
// (OpenRouter's web-search plugin) to produce deeper, sourced advice than the
// regular convo router — current facts, comparisons, and pitfalls pulled from
// the live web rather than the model's memory alone.

const HistoryMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const ResearchSchema = z.object({
  advice: z
    .string()
    .describe(
      "deeper, well-reasoned advice for the decision, grounded in the web research — " +
        "cover the key considerations, current facts/trade-offs, and a clear recommendation. " +
        "Use short paragraphs or bullet lines. Be concrete, not generic.",
    ),
  sources: z
    .array(
      z.object({
        title: z.string().describe("short title of the source"),
        url: z.string().describe("the source URL"),
      }),
    )
    .describe("the web sources actually used to inform the advice (may be empty)"),
});

export interface ResearchResult {
  advice: string;
  sources: { title: string; url: string }[];
}

export const researchRouter = router({
  run: publicProcedure
    .input(
      z.object({
        // The decision to research. Either the slash-command args, the question
        // carried from a surfaced widget, or the last user message.
        question: z.string().min(1).max(2000),
        history: z.array(HistoryMessage).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<ResearchResult> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Research needs an LLM with web access. Set OPENROUTER_API_KEY in .dev.vars to enable /research.",
        });
      }

      const transcript = (input.history ?? [])
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n");

      console.log("[research] decision:", input.question);

      try {
        const out = await structuredChat({
          apiKey,
          schema: ResearchSchema,
          schemaName: "research",
          web: true,
          system:
            "You are DEC's research assistant. The user is working through a decision and " +
            "wants deeper advice. Use the live web results in your context to give specific, " +
            "current, well-sourced guidance — concrete facts, real trade-offs, and pitfalls — " +
            "then a clear recommendation. Avoid generic filler. Cite the sources you relied on.",
          prompt:
            `Conversation so far:\n${transcript || "(none)"}\n\n` +
            `The decision to research deeply: ${input.question.trim()}\n\n` +
            `Research this on the web and return your advice plus the sources you used.`,
          temperature: 0.4,
          title: "research",
          // Web search adds round-trips; give it more headroom than the default.
          timeoutMs: 60_000,
        });

        return { advice: out.advice, sources: out.sources };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[research.run] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Research failed. Please try again.",
        });
      }
    }),
});
