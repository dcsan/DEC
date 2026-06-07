import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { waitlist } from "../../db/schema";

// Landing-page waitlist signups. `join` upserts on email so repeat submissions
// are idempotent. Needs DATABASE_URL; without it we surface a friendly error
// rather than crashing (the rest of the app runs key-less / DB-less).

export const waitlistRouter = router({
  join: publicProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      if (!ctx.env.DATABASE_URL) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "The waitlist needs a database. Set DATABASE_URL in .dev.vars to enable signups.",
        });
      }

      const email = input.email.trim().toLowerCase();
      try {
        await ctx.db
          .insert(waitlist)
          .values({ email })
          .onConflictDoNothing({ target: waitlist.email });
        return { ok: true };
      } catch (err) {
        console.error("[waitlist.join] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save your email. Please try again.",
        });
      }
    }),
});
