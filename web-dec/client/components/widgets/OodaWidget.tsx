// OODA / first-principles widget — see ooda.spec.ts.

import { useState, type CSSProperties } from "react";
import type { WidgetProps } from "./types";
import { blankOodaData, oodaSpec } from "./ooda.spec";

const ACCENT = "var(--vizithink-framework)";

export function OodaWidget({ onSend, onRemove }: WidgetProps) {
  const blank = blankOodaData("");
  const [title, setTitle] = useState(blank.title);
  const [observe, setObserve] = useState(blank.observe);
  const [orient, setOrient] = useState(blank.orient);
  const [decide, setDecide] = useState(blank.decide);
  const [act, setAct] = useState(blank.act);
  const [firstPrinciples, setFirstPrinciples] = useState(blank.firstPrinciples);
  const [sent, setSent] = useState(false);

  const bump = () => setSent(false);

  const hasContent = [observe, orient, decide, act, firstPrinciples].some((s) => s.trim());

  const send = () => {
    if (!hasContent) return;
    const data = { title, observe, orient, decide, act, firstPrinciples };
    onSend({ type: oodaSpec.type, data, text: oodaSpec.format(data) });
    setSent(true);
  };

  const block = (label: string, value: string, set: (v: string) => void, ph: string) => (
    <label style={lab}>
      <span style={labT}>{label}</span>
      <textarea
        value={value}
        placeholder={ph}
        onChange={(e) => {
          set(e.target.value);
          bump();
        }}
        rows={2}
        style={ta}
      />
    </label>
  );

  return (
    <div style={shell(ACCENT)}>
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
        <span style={{ fontSize: 13 }}>↻</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            bump();
          }}
          placeholder="Title"
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
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {block("Observe", observe, setObserve, "Facts on the ground…")}
        {block("Orient", orient, setOrient, "Interpretation, mental models…")}
        {block("Decide", decide, setDecide, "Hypothesis / choice…")}
        {block("Act", act, setAct, "Next experiment or move…")}
        {block("First principles", firstPrinciples, setFirstPrinciples, "What is true? What must be true?")}
      </div>
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
          <span style={{ marginRight: 10, fontSize: 12, color: "var(--vizithink-merged)" }}>Sent ✓</span>
        )}
        <button type="button" onClick={send} disabled={!hasContent} style={sendBtn(hasContent)}>
          {sent ? "Send again ↩" : "Send to chat ↩"}
        </button>
      </div>
    </div>
  );
}

function shell(accent: string): CSSProperties {
  return {
    width: "100%",
    maxWidth: 840,
    borderRadius: 12,
    background: "var(--vizithink-surface-2)",
    border: `1.5px solid ${accent}`,
    boxShadow: "0 1px 2px #0006",
    color: "var(--vizithink-text)",
    overflow: "hidden",
  };
}

const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labT: CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--vizithink-text-subtle)" };
const ta: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text)",
  outline: "none",
  resize: "vertical",
  fontFamily: "inherit",
  minHeight: 48,
};

const iconBtn: CSSProperties = {
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

const sendBtn = (enabled: boolean): CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: enabled ? "var(--vizithink-accent)" : "var(--vizithink-border)",
  color: enabled ? "#0f1115" : "var(--vizithink-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
});
