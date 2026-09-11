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
  // Optional: you.com Research API key — /research uses it when set, else it
  // falls back to an OpenRouter web-search call. See src/services/youResearch.ts.
  YDC_API_KEY?: string;
  // Better Auth (Phase 5c) — the OAuth/OIDC server for the ChatGPT App Connect
  // flow. SECRET is a secret (.dev.vars / `wrangler secret put`); URL is the
  // public origin used as the OAuth issuer (the tunnel / prod host).
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
}
