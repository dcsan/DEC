// Standalone Factor Weighting widget for the chat view. A yes/no decision is
// broken into the factors that pull on it; the user ranks how much each one
// matters to them on a single 1-5 slider. A "Suggest" button asks the server
// LLM (trpc.factors.suggest) to draft the factors for the question. No option
// columns, no auto verdict — on "Send" it formats via the spec and posts the
// ranked factors back to chat, where the assistant weighs them.

import { useEffect, useRef, useState } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import {
  blankFactorsData,
  factorsSpec,
  type Factor,
} from "./factors.spec";

const ACCENT = "var(--dec-merged)";

export function FactorsWidget({ initial, onSend, onRemove }: WidgetProps) {
  const seed = blankFactorsData(initial?.title || "");
  const [question, setQuestion] = useState(seed.question);
  // Start blank; the real factors are generated from the decision on mount.
  // The router's `items` are the *choices* (e.g. "Join the startup" / "Stay at
  // my corporate job") — NOT factors — so we deliberately ignore them here.
  const [factors, setFactors] = useState<Factor[]>(seed.factors);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = trpc.factors.suggest.useMutation();
  const more = trpc.suggest.more.useMutation();

  // Any edit re-arms the Send button and clears a stale error.
  const dirty = () => {
    setSent(false);
    setError(null);
  };

  const patch = (i: number, p: Partial<Factor>) => {
    setFactors((cur) => cur.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
    dirty();
  };
  const addFactor = () => {
    setFactors((cur) => [...cur, { text: "", importance: 3 }]);
    dirty();
  };
  const removeFactor = (i: number) => {
    setFactors((cur) => cur.filter((_, idx) => idx !== i));
    dirty();
  };

  // Ask the LLM to draft the factors that bear on this decision.
  const runSuggest = async () => {
    if (!question.trim() || suggest.isPending) return;
    setError(null);
    try {
      const out = await suggest.mutateAsync({ question: question.trim() });
      if (out.factors.length) {
        setFactors(out.factors.map((text) => ({ text, importance: 3 })));
      }
      setSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate factors.");
    }
  };

  // Append more factors from the LLM, keeping the ones already ranked.
  const generateMore = async () => {
    if (!question.trim() || more.isPending) return;
    setError(null);
    try {
      const out = await more.mutateAsync({
        question: question.trim(),
        itemNoun: "factor that bears on this decision",
        existing: factors.map((f) => f.text.trim()).filter(Boolean),
      });
      if (out.items.length) {
        setFactors((cur) => [...cur, ...out.items.map((text) => ({ text, importance: 3 }))]);
        setSent(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate more.");
    }
  };

  // When the router surfaces this widget with a decision already, draft the
  // factors once on mount — that's the payoff of being routed here. (We always
  // generate: the router's `items` are the choices, not the factors we want.)
  const autofilled = useRef(false);
  useEffect(() => {
    if (autofilled.current) return;
    autofilled.current = true;
    if (initial?.question?.trim() || initial?.title?.trim()) void runSuggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasContent = factors.some((f) => f.text.trim() !== "");

  const send = () => {
    if (!hasContent) return;
    const data = { question, factors };
    onSend({ type: factorsSpec.type, data, text: factorsSpec.format(data) });
    setSent(true);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 460,
        borderRadius: 12,
        background: "var(--dec-surface-2)",
        border: `1.5px solid ${ACCENT}`,
        boxShadow: "0 1px 2px #0006",
        color: "var(--dec-text)",
        overflow: "hidden",
      }}
    >
      {/* Header — the yes/no decision */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderBottom: "1px solid var(--dec-border-soft)",
          background: "var(--dec-surface)",
        }}
      >
        <span style={{ fontSize: 13 }}>✓</span>
        <input
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            dirty();
          }}
          placeholder="What are you deciding? (e.g. should I join a startup?)"
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            background: "transparent",
            color: "var(--dec-text)",
            outline: "none",
          }}
        />
        <button type="button" title="Remove widget" onClick={onRemove} style={iconBtn}>
          ⨯
        </button>
      </div>

      {/* Suggest bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "6px 10px",
          borderBottom: "1px solid var(--dec-border-soft)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--dec-text-subtle)" }}>
          {suggest.isPending || more.isPending
            ? "Thinking…"
            : error
              ? error
              : "Add more factors with AI."}
        </span>
        <button
          type="button"
          onClick={generateMore}
          disabled={!question.trim() || suggest.isPending || more.isPending}
          style={suggestBtn(!!question.trim() && !suggest.isPending && !more.isPending)}
        >
          ✨ generate more
        </button>
      </div>

      {/* Factors — each ranked by how much it matters on a 1-5 slider */}
      <div style={{ padding: "6px 10px" }}>
        {factors.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              padding: "8px 0",
              borderBottom:
                i < factors.length - 1 ? "1px solid var(--dec-border-soft)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                value={f.text}
                placeholder={`Factor ${i + 1} (e.g. freedom from corporate life)`}
                onChange={(e) => patch(i, { text: e.target.value })}
                style={rowInput}
              />
              <button
                type="button"
                title="Remove factor"
                onClick={() => removeFactor(i)}
                style={{ ...iconBtn, width: 22, color: "var(--dec-text-subtle)" }}
              >
                −
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 28 }}>
              <span style={{ fontSize: 11, color: "var(--dec-text-subtle)", whiteSpace: "nowrap" }}>
                Matters
              </span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={f.importance}
                onChange={(e) => patch(i, { importance: Number(e.target.value) })}
                style={{ flex: 1, accentColor: ACCENT, cursor: "pointer" }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--dec-text)",
                  width: 26,
                  textAlign: "right",
                }}
              >
                {f.importance}/5
              </span>
            </div>
          </div>
        ))}

        <button type="button" onClick={addFactor} style={addRowBtn}>
          + add factor
        </button>
      </div>

      {/* Footer — send the ranked factors back to chat */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "8px 10px",
          borderTop: "1px solid var(--dec-border-soft)",
          background: "var(--dec-surface)",
        }}
      >
        {sent && (
          <span style={{ marginRight: 10, fontSize: 12, color: "var(--dec-merged)" }}>
            Sent ✓
          </span>
        )}
        <button type="button" onClick={send} disabled={!hasContent} style={sendBtn(hasContent)}>
          {sent ? "Send again ↩" : "Send to chat ↩"}
        </button>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  fontSize: 12,
  width: 20,
  height: 20,
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface-2)",
  color: "#ff8b8b",
  cursor: "pointer",
  flexShrink: 0,
};

const rowInput: React.CSSProperties = {
  flex: 1,
  padding: "5px 7px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  color: "var(--dec-text)",
  outline: "none",
};

const addRowBtn: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px dashed var(--dec-border)",
  background: "transparent",
  color: "var(--dec-text-muted)",
  cursor: "pointer",
};

const suggestBtn = (enabled: boolean): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 8,
  border: "1px solid var(--dec-border)",
  background: enabled ? "var(--dec-accent-soft)" : "var(--dec-surface)",
  color: enabled ? "var(--dec-text)" : "var(--dec-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
  flexShrink: 0,
});

const sendBtn = (enabled: boolean): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: enabled ? "var(--dec-accent)" : "var(--dec-border)",
  color: enabled ? "#0f1115" : "var(--dec-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
});
