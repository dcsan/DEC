import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { boards, nodes, edges, messages, type DecisionType } from "../../db/schema";

const DECISION_TYPES: DecisionType[] = [
  "binary",
  "multi_option",
  "future_planning",
  "risk_tradeoff",
  "prioritisation",
  "resource_allocation",
  "reversibility",
  "group",
  "values",
  "unknown",
];

export const boardRouter = router({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.select().from(boards).orderBy(desc(boards.updatedAt)).limit(100),
  ),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().max(200).optional(),
        decisionType: z.enum(DECISION_TYPES as [string, ...string[]]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [board] = await ctx.db
        .insert(boards)
        .values({
          title: input.title?.trim() || "Untitled decision",
          decisionType: (input.decisionType as DecisionType) ?? "unknown",
        })
        .returning();

      // Seed the conversation with the opening AI prompt.
      await ctx.db.insert(messages).values({
        boardId: board.id,
        role: "assistant",
        content: "Hi — what decision are you weighing up?",
      });

      return board;
    }),

  // Full board snapshot: the board row plus all its nodes, edges and messages.
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [board] = await ctx.db
        .select()
        .from(boards)
        .where(eq(boards.id, input.id));
      if (!board) return null;

      const [boardNodes, boardEdges, boardMessages] = await Promise.all([
        ctx.db.select().from(nodes).where(eq(nodes.boardId, input.id)),
        ctx.db.select().from(edges).where(eq(edges.boardId, input.id)),
        ctx.db
          .select()
          .from(messages)
          .where(eq(messages.boardId, input.id))
          .orderBy(messages.createdAt),
      ]);

      return { board, nodes: boardNodes, edges: boardEdges, messages: boardMessages };
    }),

  rename: publicProcedure
    .input(z.object({ id: z.string(), title: z.string().max(200) }))
    .mutation(async ({ ctx, input }) => {
      const [board] = await ctx.db
        .update(boards)
        .set({ title: input.title.trim() || "Untitled decision", updatedAt: new Date() })
        .where(eq(boards.id, input.id))
        .returning();
      return board;
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(nodes).where(eq(nodes.boardId, input.id));
      await ctx.db.delete(edges).where(eq(edges.boardId, input.id));
      await ctx.db.delete(messages).where(eq(messages.boardId, input.id));
      await ctx.db.delete(boards).where(eq(boards.id, input.id));
      return { ok: true as const };
    }),
});
