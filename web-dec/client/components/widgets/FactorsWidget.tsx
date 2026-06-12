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

const ACCENT = "var(--vizithink-merged)";

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
  const more = trpc.factors.suggest.useMutation();
  const busy = suggest.isPending || more.isPending;

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
    setFactors((cur) => [...cur, { label: "", left: "", right: "", value: 3 }]);
    dirty();
  };
  const removeFactor = (i: number) => {
    setFactors((cur) => cur.filter((_, idx) => idx !== i));
    dirty();
  };

  // Ask the LLM to draft the factors (each a left↔right spectrum) for this
  // decision, replacing the blank starter rows.
  const runSuggest = async () => {
    if (!question.trim() || suggest.isPending) return;
    setError(null);
    try {
      const out = await suggest.mutateAsync({ question: question.trim() });
      if (out.factors.length) {
        setFactors(out.factors.map((f) => ({ ...f, value: 3 })));
      }
      setSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate factors.");
    }
  };

  // Append more spectrum-factors, keeping the ones already positioned and
  // skipping any whose label is already on screen.
  const generateMore = async () => {
    if (!question.trim() || more.isPending) return;
    setError(null);
    try {
      const out = await more.mutateAsync({
        question: question.trim(),
        existing: factors.map((f) => f.label.trim()).filter(Boolean),
      });
      if (out.factors.length) {
        setFactors((cur) => [...cur, ...out.factors.map((f) => ({ ...f, value: 3 }))]);
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

  const hasContent = factors.some((f) => f.label.trim() !== "");

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
        maxWidth: 840,
        borderRadius: 12,
        background: "var(--vizithink-surface-2)",
        border: `1.5px solid ${ACCENT}`,
        boxShadow: "0 1px 2px #0006",
        color: "var(--vizithink-text)",
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
          borderBottom: "1px solid var(--vizithink-border-soft)",
          background: "var(--vizithink-surface)",
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
            color: "var(--vizithink-text)",
            outline: "none",
          }}
        />
        <button type="button" title="Remove widget" onClick={onRemove} style={iconBtn}>
          ⨯
        </button>
      </div>

      {/* Instruction */}
      <p
        style={{
          margin: 0,
          padding: "8px 10px",
          fontSize: 12,
          color: "var(--vizithink-text-muted)",
          borderBottom: "1px solid var(--vizithink-border-soft)",
        }}
      >
        Slide each factor toward the side that fits you or that you prefer.
      </p>

      {/* Suggest bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "6px 10px",
          borderBottom: "1px solid var(--vizithink-border-soft)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--vizithink-text-subtle)" }}>
          {busy ? "Thinking…" : error ? error : "Add more factors with AI."}
        </span>
        <button
          type="button"
          onClick={generateMore}
          disabled={!question.trim() || busy}
          style={suggestBtn(!!question.trim() && !busy)}
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
                i < factors.length - 1 ? "1px solid var(--vizithink-border-soft)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                value={f.label}
                placeholder={`Factor ${i + 1} (e.g. organizational structure)`}
                onChange={(e) => patch(i, { label: e.target.value })}
                style={{ ...rowInput, fontWeight: 600 }}
              />
              <button
                type="button"
                title="Remove factor"
                onClick={() => removeFactor(i)}
                style={{ ...iconBtn, width: 22, color: "var(--vizithink-text-subtle)" }}
              >
                −
              </button>
            </div>
            {/* The spectrum: left pole ← slider → right pole (opposite values) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 28 }}>
              <input
                value={f.left}
                placeholder="left"
                onChange={(e) => patch(i, { left: e.target.value })}
                style={poleInput("left")}
              />
              <input
                type="range"
                className="vt-range"
                min={1}
                max={5}
                step={1}
                value={f.value}
                onChange={(e) => patch(i, { value: Number(e.target.value) })}
                style={{ flex: 1 }}
              />
              <input
                value={f.right}
                placeholder="right"
                onChange={(e) => patch(i, { right: e.target.value })}
                style={poleInput("right")}
              />
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
          borderTop: "1px solid var(--vizithink-border-soft)",
          background: "var(--vizithink-surface)",
        }}
      >
        {sent && (
          <span style={{ marginRight: 10, fontSize: 12, color: "var(--vizithink-merged)" }}>
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
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "#ff8b8b",
  cursor: "pointer",
  flexShrink: 0,
};

const rowInput: React.CSSProperties = {
  flex: 1,
  padding: "5px 7px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text)",
  outline: "none",
};

// A small pole-label field flanking the slider. Left-aligned on the left end,
// right-aligned on the right, so the spectrum reads label … ←slider→ … label.
const poleInput = (side: "left" | "right"): React.CSSProperties => ({
  width: 92,
  flexShrink: 0,
  padding: "4px 6px",
  fontSize: 11,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border-soft)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text-muted)",
  outline: "none",
  textAlign: side === "right" ? "right" : "left",
});

const addRowBtn: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px dashed var(--vizithink-border)",
  background: "transparent",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
};

const suggestBtn = (enabled: boolean): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 8,
  border: "1px solid var(--vizithink-border)",
  background: enabled ? "var(--vizithink-accent-soft)" : "var(--vizithink-surface)",
  color: enabled ? "var(--vizithink-text)" : "var(--vizithink-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
  flexShrink: 0,
});

const sendBtn = (enabled: boolean): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: enabled ? "var(--vizithink-accent)" : "var(--vizithink-border)",
  color: enabled ? "#0f1115" : "var(--vizithink-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
});
