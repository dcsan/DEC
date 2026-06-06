import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { boards, messages } from "../../db/schema";
import { llmJSON } from "../../lib/llm";

export const messageRouter = router({
  list: publicProcedure
    .input(z.object({ boardId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(messages)
        .where(eq(messages.boardId, input.boardId))
        .orderBy(messages.createdAt),
    ),

  // Append a user message and generate an assistant reply. The reply may also
  // suggest a decision framework to plot on the canvas (returned as `suggest`).
  send: publicProcedure
    .input(z.object({ boardId: z.string(), content: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const [userMsg] = await ctx.db
        .insert(messages)
        .values({ boardId: input.boardId, role: "user", content: input.content.trim() })
        .returning();

      // Pull recent history for context.
      const history = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.boardId, input.boardId))
        .orderBy(messages.createdAt);

      const reply = await coach(ctx.env.OPENROUTER_API_KEY, history);

      const [assistantMsg] = await ctx.db
        .insert(messages)
        .values({ boardId: input.boardId, role: "assistant", content: reply.reply })
        .returning();

      await ctx.db
        .update(boards)
        .set({ updatedAt: new Date() })
        .where(eq(boards.id, input.boardId));

      return { userMsg, assistantMsg, suggest: reply.suggest };
    }),
});

interface CoachReply {
  reply: string;
  // Optional framework the UI could offer to add to the canvas.
  suggest?: { framework: string; reason: string } | null;
}

async function coach(
  apiKey: string | undefined,
  history: { role: string; content: string }[],
): Promise<CoachReply> {
  const transcript = history
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");

  const out = await llmJSON<CoachReply>(
    apiKey,
    `Here is the conversation so far:\n${transcript}\n\n` +
      `Respond as the decision coach. Ask one sharp follow-up question OR, if you have ` +
      `enough context, suggest a thinking framework (SWOT, decision matrix, pre-mortem, ` +
      `scenario planning, regret minimisation, …). Return JSON ` +
      `{"reply":"...","suggest":{"framework":"name","reason":"why"}} (suggest may be null).`,
    {
      system:
        "You are DEC, an AI decision coach. Be warm, brief and Socratic. One idea per turn.",
    },
  );
  if (out?.reply) return out;

  // Fallback when no LLM is configured: a generic but useful nudge.
  const last = history[history.length - 1]?.content ?? "";
  return {
    reply:
      `Got it. To help map "${last.slice(0, 60)}", what does a good outcome look like, ` +
      `and what's the main thing you're worried about? (Add OPENROUTER_API_KEY for a smarter coach.)`,
    suggest: null,
  };
}
