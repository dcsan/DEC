// Thin OpenRouter chat wrapper. Everything funnels through `llmJSON`, which
// asks the model for a JSON object and parses it. When no API key is present
// (the default dev setup) it returns null so callers can fall back to a
// deterministic stub — the app stays fully runnable without a key.

// Swap for a newer slug once you've confirmed it on OpenRouter, e.g.
// "anthropic/claude-sonnet-4.5". 3.5-sonnet is a known-good default.
const LLM_MODEL = "anthropic/claude-3.5-sonnet";

interface ChatOpts {
  system?: string;
  temperature?: number;
  model?: string;
}

export async function llmJSON<T>(
  apiKey: string | undefined,
  prompt: string,
  opts: ChatOpts = {},
): Promise<T | null> {
  if (!apiKey) return null;

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model ?? LLM_MODEL,
        temperature: opts.temperature ?? 0.5,
        response_format: { type: "json_object" },
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch (err) {
    console.error("[llm] network error", err);
    return null;
  }

  if (!res.ok) {
    console.error("[llm] non-ok", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
  } | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content) as T;
  } catch {
    console.error("[llm] could not parse JSON content", content.slice(0, 200));
    return null;
  }
}
