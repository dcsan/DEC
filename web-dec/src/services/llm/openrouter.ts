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
import { LLM_MODEL } from "../../config";
import { recordLlmCall } from "./trace";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

// Default model lives in the server config (src/config.ts), not here, so the
// model choice is configurable in one obvious place. Re-exported for callers
// that want to reference it. Override per-call via the `model` option.
export const DEFAULT_MODEL = LLM_MODEL;

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
  /**
   * Enable OpenRouter's web-search plugin: the model's context is augmented with
   * live web results before it answers (works with any model, citations land in
   * the prose). Used by the /research feature. Default off.
   */
  web?: boolean;
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
    // OpenRouter-side web search: runs the search and injects results into the
    // model's context. Independent of the model, so it composes with json_schema.
    ...(opts.web ? { plugins: [{ id: "web" }] } : {}),
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.apiKey}`,
    "Content-Type": "application/json",
  };
  if (opts.title) headers["X-Title"] = opts.title;

  // Record the exchange (success or failure) for the /chat prompts sidebar — a
  // no-op unless the request opted into tracing (see src/trpc/trpc.ts).
  const startedAt = Date.now();
  let content: string | undefined;
  const trace = (out: { response?: string; error?: string }) =>
    recordLlmCall({
      title: opts.title,
      schemaName: opts.schemaName,
      model: body.model,
      temperature: opts.temperature,
      web: opts.web,
      system: opts.system,
      prompt: opts.prompt,
      schema: jsonSchema,
      startedAt,
      ms: Date.now() - startedAt,
      ...out,
    });

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
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
    content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error(
        `OpenRouter chat returned no content: ${JSON.stringify(json).slice(0, 300)}`,
      );
    }

    // With json_schema the content is guaranteed JSON — parse once, validate.
    const parsed = JSON.parse(content);
    const result = opts.schema.parse(parsed) as z.infer<S>;
    trace({ response: content });
    return result;
  } catch (err) {
    trace({ response: content, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
