import type { Context as HonoContext } from "hono";
import { createDb, type Db } from "../db/client";
import type { Bindings } from "../env";

export interface Context {
  db: Db;
  env: Bindings;
}

// Builds the per-request tRPC context from the Hono request context.
export function createContext(c: HonoContext<{ Bindings: Bindings }>): Context {
  return { db: createDb(c.env.DB), env: c.env };
}
