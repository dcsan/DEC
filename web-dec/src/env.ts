// Worker bindings — keep in sync with wrangler.jsonc.
export interface Bindings {
  ASSETS: Fetcher;
  DB: D1Database;
  // Optional: enables the LLM-backed concept search / expand / merge.
  // Without it those endpoints fall back to deterministic stubs.
  OPENROUTER_API_KEY?: string;
  GOOGLE_GEMINI_KEY?: string;
}
