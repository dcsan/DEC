// Right-hand "prompts" sidebar for /chat: every LLM request the app made this
// session (system + user prompt) and the model's raw response, newest first.
// Fed by the llmTraceLink store (client/lib/llmTrace.ts).

import { useEffect, useState, type CSSProperties } from "react";
import {
  clearLlmTrace,
  setLlmTraceOpen,
  useLlmTrace,
  useLlmTraceOpen,
  type TraceEntry,
} from "../lib/llmTrace";

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const iconButton: CSSProperties = {
  padding: "4px 9px",
  fontSize: 12,
  borderRadius: 7,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
};

// Navbar toggle for the sidebar. Badges LLM calls that arrived while closed.
export function LlmTraceButton() {
  const open = useLlmTraceOpen();
  const count = useLlmTrace().length;
  const [seen, setSeen] = useState(0);
  useEffect(() => {
    if (open) setSeen(count);
  }, [open, count]);
  const unseen = open ? 0 : Math.max(0, count - seen);

  return (
    <button
      type="button"
      onClick={() => setLlmTraceOpen(!open)}
      title="Show LLM prompts & responses"
      aria-label="Toggle LLM prompts sidebar"
      aria-pressed={open}
      style={{
        position: "relative",
        width: 30,
        height: 30,
        fontSize: 15,
        lineHeight: 1,
        borderRadius: 8,
        border: `1px solid ${open ? "var(--vizithink-accent)" : "var(--vizithink-border)"}`,
        background: open ? "var(--vizithink-accent-soft)" : "var(--vizithink-surface-2)",
        cursor: "pointer",
      }}
    >
      🧠
      {unseen > 0 && (
        <span
          style={{
            position: "absolute",
            top: -5,
            right: -5,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "16px",
            background: "var(--vizithink-accent)",
            color: "var(--vizithink-bg)",
          }}
        >
          {unseen}
        </span>
      )}
    </button>
  );
}

export function LlmTracePanel({ onClose }: { onClose: () => void }) {
  const entries = useLlmTrace();
  // Which cards are expanded. The newest call opens automatically.
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const newestId = entries.at(-1)?.id;
  useEffect(() => {
    if (newestId) setOpen((s) => new Set(s).add(newestId));
  }, [newestId]);

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <aside
      aria-label="LLM prompts"
      style={{
        width: "min(460px, 100%)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        borderLeft: "1px solid var(--vizithink-border-soft)",
        background: "var(--vizithink-surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderBottom: "1px solid var(--vizithink-border-soft)",
        }}
      >
        <span style={{ fontSize: 16 }}>🧠</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--vizithink-text)" }}>Prompts</div>
          <div style={{ fontSize: 11, color: "var(--vizithink-text-subtle)" }}>
            {entries.length} LLM call{entries.length === 1 ? "" : "s"} this session
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button type="button" onClick={clearLlmTrace} disabled={!entries.length} style={iconButton}>
            Clear
          </button>
          <button type="button" onClick={onClose} aria-label="Close prompts sidebar" style={iconButton}>
            ✕
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {entries.length === 0 ? (
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--vizithink-text-muted)" }}>
            No LLM calls yet. Send a message — each model request (system prompt + user prompt)
            and the raw response will show up here.
            <div style={{ marginTop: 8, color: "var(--vizithink-text-subtle)" }}>
              Without <code style={{ fontFamily: mono }}>OPENROUTER_API_KEY</code> the app uses
              deterministic fallbacks and makes no LLM calls.
            </div>
          </div>
        ) : (
          [...entries]
            .reverse()
            .map((e) => (
              <TraceCard key={e.id} entry={e} open={open.has(e.id)} onToggle={() => toggle(e.id)} />
            ))
        )}
      </div>
    </aside>
  );
}

function TraceCard({
  entry: e,
  open,
  onToggle,
}: {
  entry: TraceEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const time = new Date(e.startedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <div
      style={{
        marginBottom: 10,
        borderRadius: 10,
        border: `1px solid ${e.error ? "var(--vizithink-bad)" : "var(--vizithink-border-soft)"}`,
        background: "var(--vizithink-surface-2)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: "block",
          width: "100%",
          padding: "8px 10px",
          border: "none",
          background: "transparent",
          textAlign: "left",
          cursor: "pointer",
          color: "var(--vizithink-text)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--vizithink-text-subtle)" }}>{open ? "▾" : "▸"}</span>
          <code style={{ fontFamily: mono, fontSize: 12, fontWeight: 700 }}>{e.path}</code>
          {e.title && (
            <span
              style={{
                fontSize: 11,
                padding: "1px 7px",
                borderRadius: 999,
                background: "var(--vizithink-accent-soft)",
                color: "var(--vizithink-accent)",
              }}
            >
              {e.title}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--vizithink-text-subtle)" }}>
            {(e.ms / 1000).toFixed(1)}s · {time}
          </span>
        </div>
        <div style={{ marginTop: 3, marginLeft: 18, fontSize: 11, color: "var(--vizithink-text-subtle)" }}>
          {e.model}
          {e.temperature != null && ` · temp ${e.temperature}`}
          {e.web && " · web search"}
          {` · schema ${e.schemaName}`}
          {e.error && <span style={{ color: "var(--vizithink-bad)" }}> · failed</span>}
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 10px 10px" }}>
          {e.system && <Section label="System →" text={e.system} tone="muted" />}
          <Section label="Prompt →" text={e.prompt} />
          {e.response != null && <Section label="← Response" text={prettyJson(e.response)} tone="accent" />}
          {e.error && <Section label="Error" text={e.error} tone="bad" />}
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 11, color: "var(--vizithink-text-subtle)", cursor: "pointer" }}>
              Response schema ({e.schemaName})
            </summary>
            <Pre text={JSON.stringify(e.schema, null, 2)} tone="muted" />
          </details>
        </div>
      )}
    </div>
  );
}

type Tone = "default" | "muted" | "accent" | "bad";

const toneColor: Record<Tone, string> = {
  default: "var(--vizithink-text)",
  muted: "var(--vizithink-text-muted)",
  accent: "var(--vizithink-merged)",
  bad: "var(--vizithink-bad)",
};

function Section({ label, text, tone = "default" }: { label: string; text: string; tone?: Tone }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: toneColor[tone] }}>{label}</span>
        <span style={{ fontSize: 10.5, color: "var(--vizithink-text-subtle)" }}>
          {text.length.toLocaleString()} chars
        </span>
        <button
          type="button"
          onClick={copy}
          style={{
            marginLeft: "auto",
            padding: 0,
            fontSize: 10.5,
            border: "none",
            background: "transparent",
            color: "var(--vizithink-text-subtle)",
            cursor: "pointer",
          }}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <Pre text={text} tone={tone} />
    </div>
  );
}

function Pre({ text, tone = "default" }: { text: string; tone?: Tone }) {
  return (
    <pre
      style={{
        margin: 0,
        maxHeight: 320,
        overflow: "auto",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--vizithink-border-soft)",
        background: "var(--vizithink-bg)",
        fontFamily: mono,
        fontSize: 11.5,
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        color: toneColor[tone],
      }}
    >
      {text}
    </pre>
  );
}

// Responses are JSON (schema-constrained) — indent them for reading. Anything
// that doesn't parse (e.g. a truncated reply that failed) is shown verbatim.
function prettyJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
