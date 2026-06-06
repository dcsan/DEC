// Standalone Options A/B widget for the chat view. Pick between two options by
// ticking, for each decision point, which option it favours. A "Suggest" button
// asks the server LLM (trpc options.suggest) to generate the two option labels
// and five decision points with the checks pre-filled. No react-flow, no store —
// local state only; on "Send" it formats via the spec and posts back to chat.

import { useEffect, useRef, useState } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import { blankOptionsData, optionsSpec, type OptionRow } from "./options.spec";

const ACCENT = "var(--dec-option)";

export function OptionsWidget({ initial, onSend, onRemove }: WidgetProps) {
  const seed = blankOptionsData(initial?.title || "");
  const [question, setQuestion] = useState(seed.question);
  // The router prefills `items` with the choices it extracted (e.g. ["Dog",
  // "Cat"]); use them as the two option labels when present.
  const [optionA, setOptionA] = useState(initial?.items?.[0]?.trim() || "");
  const [optionB, setOptionB] = useState(initial?.items?.[1]?.trim() || "");
  const [rows, setRows] = useState<OptionRow[]>(seed.rows);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = trpc.options.suggest.useMutation();

  // Any edit re-arms the Send button and clears a stale error.
  const dirty = () => {
    setSent(false);
    setError(null);
  };

  const patchRow = (i: number, p: Partial<OptionRow>) => {
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
    dirty();
  };
  const addRow = () => {
    setRows((cur) => [...cur, { text: "", a: false, b: false }]);
    dirty();
  };
  const removeRow = (i: number) => {
    setRows((cur) => cur.filter((_, idx) => idx !== i));
    dirty();
  };

  // Ask the LLM for two labels + five pre-checked decision points.
  const runSuggest = async () => {
    if (!question.trim() || suggest.isPending) return;
    setError(null);
    try {
      const out = await suggest.mutateAsync({
        question: question.trim(),
        optionA: optionA.trim() || undefined,
        optionB: optionB.trim() || undefined,
      });
      setOptionA(out.optionA);
      setOptionB(out.optionB);
      setRows(out.rows.length ? out.rows : rows);
      setSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate suggestions.");
    }
  };

  // When the router surfaces this widget with a question already, generate the
  // decision points once on mount — that's the payoff of being routed here.
  const autofilled = useRef(false);
  useEffect(() => {
    if (autofilled.current) return;
    autofilled.current = true;
    if (initial?.title?.trim()) void runSuggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasContent = rows.some((r) => r.text.trim() !== "");

  const send = () => {
    if (!hasContent) return;
    const data = { question, optionA, optionB, rows };
    onSend({ type: optionsSpec.type, data, text: optionsSpec.format(data) });
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
      {/* Header — the decision question */}
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
        <span style={{ fontSize: 13 }}>⚖︎</span>
        <input
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            dirty();
          }}
          placeholder="What are you deciding? (e.g. dog or cat?)"
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
          {suggest.isPending
            ? "Thinking…"
            : error
              ? error
              : "Let AI draft the decision points."}
        </span>
        <button
          type="button"
          onClick={runSuggest}
          disabled={!question.trim() || suggest.isPending}
          style={suggestBtn(!!question.trim() && !suggest.isPending)}
        >
          {hasContent ? "↻ Regenerate" : "✨ Suggest"}
        </button>
      </div>

      {/* Three-column comparison: decision point | option A | option B */}
      <div style={{ padding: "6px 10px" }}>
        {/* Column headers — option labels are editable */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ flex: 1, fontSize: 11, color: "var(--dec-text-subtle)", paddingLeft: 2 }}>
            Decision point
          </span>
          <input
            value={optionA}
            onChange={(e) => {
              setOptionA(e.target.value);
              dirty();
            }}
            placeholder="Option A"
            style={{ ...optLabelInput, color: "var(--dec-merged)" }}
          />
          <input
            value={optionB}
            onChange={(e) => {
              setOptionB(e.target.value);
              dirty();
            }}
            placeholder="Option B"
            style={{ ...optLabelInput, color: "var(--dec-option)" }}
          />
          <span style={{ width: 22 }} />
        </div>

        {/* Rows */}
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <input
              value={r.text}
              placeholder={`Point ${i + 1}`}
              onChange={(e) => patchRow(i, { text: e.target.value })}
              style={rowInput}
            />
            <span style={{ width: COL, textAlign: "center" }}>
              <input
                type="checkbox"
                checked={r.a}
                onChange={(e) => patchRow(i, { a: e.target.checked })}
                style={{ accentColor: "var(--dec-merged)", cursor: "pointer" }}
              />
            </span>
            <span style={{ width: COL, textAlign: "center" }}>
              <input
                type="checkbox"
                checked={r.b}
                onChange={(e) => patchRow(i, { b: e.target.checked })}
                style={{ accentColor: "var(--dec-option)", cursor: "pointer" }}
              />
            </span>
            <button
              type="button"
              title="Remove point"
              onClick={() => removeRow(i)}
              style={{ ...iconBtn, width: 22, color: "var(--dec-text-subtle)" }}
            >
              −
            </button>
          </div>
        ))}

        <button type="button" onClick={addRow} style={addRowBtn}>
          + add point
        </button>
      </div>

      {/* Footer — send results back to chat */}
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
          <span style={{ marginRight: 10, fontSize: 12, color: "var(--dec-merged)" }}>Sent ✓</span>
        )}
        <button type="button" onClick={send} disabled={!hasContent} style={sendBtn(hasContent)}>
          {sent ? "Send again ↩" : "Send to chat ↩"}
        </button>
      </div>
    </div>
  );
}

// Width of each option (checkbox) column — header label and checkbox align.
const COL = 56;

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

const optLabelInput: React.CSSProperties = {
  width: COL,
  padding: "4px 4px",
  fontSize: 11,
  fontWeight: 600,
  textAlign: "center",
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  outline: "none",
};

const addRowBtn: React.CSSProperties = {
  marginTop: 2,
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
