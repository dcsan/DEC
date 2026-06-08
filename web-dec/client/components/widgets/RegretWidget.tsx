// Regret minimisation widget — see regret.spec.ts.

import { useState, type CSSProperties } from "react";
import type { WidgetProps } from "./types";
import { blankRegretData, regretSpec } from "./regret.spec";

const ACCENT = "var(--vizithink-merged)";

export function RegretWidget({ onSend, onRemove }: WidgetProps) {
  const blank = blankRegretData("");
  const [title, setTitle] = useState(blank.title);
  const [horizonYears, setHorizonYears] = useState(blank.horizonYears);
  const [optionA, setOptionA] = useState(blank.optionA);
  const [optionB, setOptionB] = useState(blank.optionB);
  const [regretIfA, setRegretIfA] = useState(blank.regretIfA);
  const [regretIfB, setRegretIfB] = useState(blank.regretIfB);
  const [sent, setSent] = useState(false);

  const bump = () => setSent(false);

  const hasContent = Boolean(
    optionA.trim() ||
      optionB.trim() ||
      regretIfA.trim() ||
      regretIfB.trim() ||
      horizonYears.trim(),
  );

  const send = () => {
    if (!hasContent) return;
    const data = { title, horizonYears, optionA, optionB, regretIfA, regretIfB };
    onSend({ type: regretSpec.type, data, text: regretSpec.format(data) });
    setSent(true);
  };

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
        <span style={{ fontSize: 13 }}>⏳</span>
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
        <label style={lab}>
          <span style={labT}>Regret horizon (years)</span>
          <input
            value={horizonYears}
            onChange={(e) => {
              setHorizonYears(e.target.value);
              bump();
            }}
            placeholder="10"
            style={inp}
          />
        </label>
        <label style={lab}>
          <span style={labT}>Option A</span>
          <input
            value={optionA}
            onChange={(e) => {
              setOptionA(e.target.value);
              bump();
            }}
            placeholder="First path…"
            style={inp}
          />
        </label>
        <label style={lab}>
          <span style={labT}>Regret if you choose A</span>
          <textarea
            value={regretIfA}
            onChange={(e) => {
              setRegretIfA(e.target.value);
              bump();
            }}
            placeholder={`In ${horizonYears || "10"} years, what might you regret?`}
            rows={3}
            style={ta}
          />
        </label>
        <label style={lab}>
          <span style={labT}>Option B</span>
          <input
            value={optionB}
            onChange={(e) => {
              setOptionB(e.target.value);
              bump();
            }}
            placeholder="Second path…"
            style={inp}
          />
        </label>
        <label style={lab}>
          <span style={labT}>Regret if you choose B</span>
          <textarea
            value={regretIfB}
            onChange={(e) => {
              setRegretIfB(e.target.value);
              bump();
            }}
            placeholder={`In ${horizonYears || "10"} years, what might you regret?`}
            rows={3}
            style={ta}
          />
        </label>
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
const inp: CSSProperties = {
  padding: "6px 8px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const ta: CSSProperties = { ...inp, resize: "vertical", fontFamily: "inherit", minHeight: 56 };

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
