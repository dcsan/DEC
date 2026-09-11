import { recordLlmCall } from "./llm/trace";

// Client for the you.com Research API
// (https://you.com/docs/api-reference/research/v1-research): a multi-step web
// research agent that returns a Markdown answer with inline citations —
// `[[1, 2]]`, positions in `sources` — plus the source list. No env reads: the
// caller passes the key. Each call is recorded in the LLM trace (the /chat 🧠
// sidebar) like a `structuredChat` call.

const ENDPOINT = "https://api.you.com/v1/research";
const INPUT_MAX = 40_000;
const SOURCES_MAX = 15;

// `frontier` is omitted: it needs background mode (async task + polling).
export type ResearchEffort = "lite" | "standard" | "deep" | "exhaustive";

interface YouSource {
  url: string;
  title?: string;
  snippets?: string[];
}

interface YouResearchResponse {
  output?: { content?: unknown; content_type?: string; sources?: YouSource[] };
  warnings?: string[];
}

export interface YouResearchResult {
  /** Markdown, with citations turned into links to their sources. */
  advice: string;
  sources: { title: string; url: string }[];
}

export async function youResearch(opts: {
  apiKey: string;
  input: string;
  effort?: ResearchEffort;
  timeoutMs?: number;
}): Promise<YouResearchResult> {
  const effort = opts.effort ?? "standard";
  const input = opts.input.slice(0, INPUT_MAX);
  const startedAt = Date.now();
  const trace = (out: { response?: string; error?: string }) =>
    recordLlmCall({
      title: "research",
      schemaName: "you.com research",
      model: `you.com/research:${effort}`,
      web: true,
      prompt: input,
      schema: null,
      ...out,
      startedAt,
      ms: Date.now() - startedAt,
    });

  let raw: string | undefined;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "X-API-Key": opts.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ input, research_effort: effort }),
      // standard is ~10–30s, deep up to ~120s.
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
    });
    raw = await res.text();
    if (!res.ok) throw new Error(`you.com research ${res.status}: ${raw.slice(0, 300)}`);

    const data = JSON.parse(raw) as YouResearchResponse;
    const content = data.output?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("you.com research returned no text content");
    }
    const sources = data.output?.sources ?? [];
    const result: YouResearchResult = {
      advice: linkCitations(content, sources),
      sources: sources.slice(0, SOURCES_MAX).map((s) => ({
        title: s.title?.trim() || hostname(s.url),
        url: s.url,
      })),
    };
    trace({ response: content });
    return result;
  } catch (err) {
    trace({ response: raw, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

// `[[1, 2]]` → `[1][2]`, each a Markdown link to that source (1-based
// positions). A number with no matching source stays as plain `[n]`.
function linkCitations(content: string, sources: YouSource[]): string {
  return content.replace(/\[\[(\d+(?:\s*,\s*\d+)*)\]\]/g, (_, nums: string) =>
    nums
      .split(",")
      .map((n) => {
        const i = n.trim();
        const src = sources[Number(i) - 1];
        return src ? `[\\[${i}\\]](<${src.url}>)` : `\\[${i}\\]`;
      })
      .join(""),
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
