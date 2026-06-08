import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";
import { getSessionContext } from "../../services/honcho";

// `/summary` endpoint for the chat view. Recalls the session from Honcho (its
// get-context blend) and, together with the live transcript, has the LLM write a
// short summary of what the user is deciding and where they've got to.

const HistoryMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const SummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "a short (2-3 sentence) summary of what the user is deciding and where the conversation has got to. Plain, concrete, second person ('You're weighing…'). No preamble.",
    ),
});

export interface SummaryResult {
  summary: string;
}

export const summaryRouter = router({
  run: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(1).max(200),
        history: z.array(HistoryMessage).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<SummaryResult> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Summaries need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable /summary.",
        });
      }

      // Recall from Honcho (best-effort — empty string if unconfigured/nothing stored).
      const recall = ctx.env.HONCHO_API_KEY
        ? await getSessionContext(ctx.env.HONCHO_API_KEY, input.sessionId, 1500)
        : "";

      const transcript = (input.history ?? [])
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n");

      if (!transcript.trim() && !recall.trim()) {
        return { summary: "There's nothing to summarise yet — tell me what you're deciding." };
      }

      try {
        const out = await structuredChat({
          apiKey,
          schema: SummarySchema,
          schemaName: "summary",
          system:
            "You are ViziThink, a decision assistant. Summarise, for the user, what they are " +
            "deciding and where the conversation has got to — the options on the table, the " +
            "key considerations raised, and any leaning so far. Two or three sentences, concrete " +
            "and in the second person. No preamble or sign-off.",
          prompt:
            (recall.trim() ? `Recalled session context:\n${recall}\n\n` : "") +
            `Conversation so far:\n${transcript || "(none)"}\n\n` +
            `Write the short summary.`,
          temperature: 0.3,
          title: "summary",
        });
        return { summary: out.summary };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[summary.run] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not summarise. Please try again.",
        });
      }
    }),
});
