import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { edges } from "../../db/schema";

export const edgeRouter = router({
  create: publicProcedure
    .input(
      z.object({
        boardId: z.string(),
        source: z.string(),
        target: z.string(),
        label: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [edge] = await ctx.db
        .insert(edges)
        .values({
          boardId: input.boardId,
          source: input.source,
          target: input.target,
          label: input.label ?? null,
        })
        .returning();
      return edge;
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(edges).where(eq(edges.id, input.id));
      return { ok: true as const };
    }),
});
