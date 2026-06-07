import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Drizzle client over Neon's HTTP driver (works in the Cloudflare Worker, Node,
// and the browser). The connection string comes from DATABASE_URL — passed in by
// the caller, never read from env here.
export function createDb(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set — the Postgres (Neon) backend is unavailable. " +
        "Add it to .dev.vars (or as a Worker secret).",
    );
  }
  return drizzle(neon(databaseUrl), { schema });
}

export type Db = ReturnType<typeof createDb>;
