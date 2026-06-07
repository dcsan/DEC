import type { Context as HonoContext } from "hono";
import { createDb, type Db } from "../db/client";
import type { Bindings } from "../env";

export interface Context {
  db: Db;
  env: Bindings;
  /**
   * Keep the Worker alive until a fire-and-forget promise settles (e.g. mirroring
   * chat turns into Honcho after the reply is sent). No-op outside the Worker
   * runtime, where there's no ExecutionContext.
   */
  waitUntil: (p: Promise<unknown>) => void;
}

// Builds the per-request tRPC context from the Hono request context.
export function createContext(c: HonoContext<{ Bindings: Bindings }>): Context {
  let waitUntil: (p: Promise<unknown>) => void;
  try {
    const ec = c.executionCtx;
    waitUntil = (p) => ec.waitUntil(p);
  } catch {
    waitUntil = () => {};
  }

  // The DB connection is created lazily on first `ctx.db` access (and memoised
  // for the request), so chat-only requests never require DATABASE_URL — only
  // the board/canvas + chat-logging paths that actually touch Postgres do.
  let db: Db | undefined;
  return {
    get db() {
      if (!db) db = createDb(c.env.DATABASE_URL);
      return db;
    },
    env: c.env,
    waitUntil,
  };
}
