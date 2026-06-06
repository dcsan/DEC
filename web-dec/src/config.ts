// Server-side runtime config: static, build-time constants for the Worker.
//
// This is NOT for secrets — those are bindings/env (see src/env.ts and
// .dev.vars). Put plain, code-level configuration here so it lives in one
// obvious place instead of being buried inside a lib.

/**
 * Default OpenRouter model id for every LLM call
 * (src/services/llm/openrouter.ts). Any individual call can still override it
 * by passing `model` to `structuredChat`. Browse ids at
 * https://openrouter.ai/models or list them with:
 *   curl https://openrouter.ai/api/v1/models -H "authorization: Bearer $KEY"
 */
export const LLM_MODEL = "google/gemini-3.1-flash-lite";
