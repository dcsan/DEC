// Worker bindings — keep in sync with wrangler.jsonc.
export interface Bindings {
  ASSETS: Fetcher;
  // Neon Postgres connection string — the database backend (Drizzle/neon-http).
  // A secret, set in .dev.vars locally / `wrangler secret put DATABASE_URL` in
  // prod. Board/canvas routers need it; the chat surface logs to it when present.
  DATABASE_URL?: string;
  // Optional: enables the LLM-backed concept search / expand / merge.
  // Without it those endpoints fall back to deterministic stubs.
  OPENROUTER_API_KEY?: string;
  // Optional: enables storing/retrieving chat context in Honcho (the /context
  // command + the /research session-context tie-in). Without it those features
  // report that Honcho isn't configured. See src/services/honcho.ts.
  HONCHO_API_KEY?: string;
}
