// LLM call tracing — the shape shared by the server (records each
// `structuredChat` exchange) and the client (the /chat 🧠 prompts sidebar).
// Kept dependency-free so the client bundle can import it without pulling in
// the server-only AsyncLocalStorage plumbing in ./trace.ts.

/** Request header a client sets (to "1") to opt into receiving traces. */
export const LLM_TRACE_HEADER = "x-llm-trace";

/** Key of the envelope that wraps a traced procedure's output on the wire. */
export const LLM_TRACE_KEY = "__llmTrace" as const;

/** One model request + response, as sent to / received from OpenRouter. */
export interface LlmCallTrace {
  /** The call's X-Title tag, e.g. "convo-router". */
  title?: string;
  schemaName: string;
  model: string;
  temperature?: number;
  web?: boolean;
  system?: string;
  prompt: string;
  /** JSON Schema sent as `response_format` (its descriptions steer the model too). */
  schema: unknown;
  /** Raw message content the model returned (present even if validation failed). */
  response?: string;
  error?: string;
  /** Epoch ms when the request was sent. */
  startedAt: number;
  ms: number;
}

/** A traced procedure's output: the real result plus the LLM calls it made. */
export interface LlmTraceEnvelope {
  [LLM_TRACE_KEY]: LlmCallTrace[];
  data: unknown;
}

export function isLlmTraceEnvelope(v: unknown): v is LlmTraceEnvelope {
  return (
    typeof v === "object" &&
    v !== null &&
    Array.isArray((v as Record<string, unknown>)[LLM_TRACE_KEY])
  );
}
