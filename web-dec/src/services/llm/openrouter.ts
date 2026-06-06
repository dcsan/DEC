/**
 * OpenRouter chat client for *structured* outputs (worker-compatible).
 *
 * Thin wrapper around `POST https://openrouter.ai/api/v1/chat/completions`.
 * Conventions follow the poco-web client:
 *   - No env reads inside the lib — the caller passes `apiKey`.
 *   - Global `fetch` only — runs in Cloudflare Workers, Node ≥ 18, browser.
 *   - Throws on non-2xx / timeout with the response body in the message.
 *
 * Unlike a free-text client, every call here is schema-driven: the caller
 * passes a zod schema, we convert it to JSON Schema and send it as the
 * model's `response_format: { type: "json_schema", ... }`. The model is
 * therefore *constrained* to emit conformant JSON — we do not strip code
 * fences or otherwise massage the output. The response is JSON.parsed once
 * and validated against the same zod schema before returning.
 */
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

// Current fast+capable Anthropic default on OpenRouter. List options with:
//   curl https://openrouter.ai/api/v1/models -H "authorization: Bearer $KEY"
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface StructuredChatInput<S extends z.ZodTypeAny> {
  apiKey: string;
  /** Zod schema: drives both the request `response_format` and validation. */
  schema: S;
  /** Schema name sent to the API (a-z, 0-9, underscores). */
  schemaName: string;
  /** User prompt. */
  prompt: string;
  /** Optional system prompt. */
  system?: string;
  /** OpenRouter model id. Defaults to {@link DEFAULT_MODEL}. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** One-line tag surfaced in OpenRouter's activity feed (X-Title). */
  title?: string;
  timeoutMs?: number;
}

/**
 * Run a schema-constrained chat completion and return the validated,
 * fully-typed result. Throws on missing key, network/HTTP error, timeout,
 * empty content, invalid JSON, or schema-validation failure.
 */
export async function structuredChat<S extends z.ZodTypeAny>(
  opts: StructuredChatInput<S>,
): Promise<z.infer<S>> {
  if (!opts.apiKey) throw new Error("structuredChat: missing apiKey");

  // zodToJsonSchema emits a JSON-Schema draft-7 object (plus a `$schema`
  // key the API doesn't want). Strip the meta key and hand the rest over.
  const jsonSchema = zodToJsonSchema(opts.schema, { target: "openApi3" }) as Record<
    string,
    unknown
  >;
  delete jsonSchema.$schema;

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    messages: [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: opts.prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: opts.schemaName,
        strict: true,
        schema: jsonSchema,
      },
    },
    ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
    ...(opts.maxTokens != null ? { max_tokens: opts.maxTokens } : {}),
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.apiKey}`,
    "Content-Type": "application/json",
  };
  if (opts.title) headers["X-Title"] = opts.title;

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`OpenRouter chat timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter chat failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(
      `OpenRouter chat returned no content: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }

  // With json_schema the content is guaranteed JSON — parse once, validate.
  const parsed = JSON.parse(content);
  return opts.schema.parse(parsed) as z.infer<S>;
}
