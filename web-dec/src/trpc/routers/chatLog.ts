import { z } from "zod";
import { eq, isNull, sql } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { chatLogs } from "../../db/schema";

// Read access to the `chat_logs` table (the /chat surface's append-only log,
// written best-effort by the chat router). Powers two things:
//   • shared-session links (/chat?s=<sessionId>) — `get` replays one session;
//   • the /admin/logs page — `sessions` lists every session with its opener.

export const chatLogRouter = router({
  // All rows for one session, oldest first, so the client can replay the
  // conversation in order.
  get: publicProcedure
    .input(z.object({ sessionId: z.string().min(1).max(200) }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(chatLogs)
        .where(eq(chatLogs.sessionId, input.sessionId))
        .orderBy(chatLogs.createdAt),
    ),

  // One row per session: the first user message (the question that started the
  // conversation), message count, and start/last timestamps. Newest-active first.
  // Optionally scoped to one temp user id (`userId: null` = rows logged before
  // user tagging existed).
  sessions: publicProcedure
    .input(z.object({ userId: z.string().min(1).max(200).nullish() }).optional())
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          sessionId: chatLogs.sessionId,
          // First user message of the session — its opening question.
          firstMessage: sql<string | null>`(array_agg(${chatLogs.content} order by ${chatLogs.createdAt}) filter (where ${chatLogs.role} = 'user'))[1]`,
          messageCount: sql<number>`count(*)::int`,
          startedAt: sql<string>`min(${chatLogs.createdAt})::text`,
          lastAt: sql<string>`max(${chatLogs.createdAt})::text`,
        })
        .from(chatLogs)
        .where(
          input?.userId === undefined
            ? undefined
            : input.userId === null
              ? isNull(chatLogs.userId)
              : eq(chatLogs.userId, input.userId),
        )
        .groupBy(chatLogs.sessionId)
        .orderBy(sql`max(${chatLogs.createdAt}) desc`),
    ),

  // One row per temp user id (per-browser localStorage id stamped on each log
  // row): how many sessions and messages they have, and when they were last
  // active. `userId` is null for rows logged before user tagging existed.
  users: publicProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        userId: chatLogs.userId,
        sessionCount: sql<number>`count(distinct ${chatLogs.sessionId})::int`,
        messageCount: sql<number>`count(*)::int`,
        firstSeen: sql<string>`min(${chatLogs.createdAt})::text`,
        lastSeen: sql<string>`max(${chatLogs.createdAt})::text`,
      })
      .from(chatLogs)
      .groupBy(chatLogs.userId)
      .orderBy(sql`max(${chatLogs.createdAt}) desc`),
  ),
});
