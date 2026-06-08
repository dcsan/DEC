// Expected value table widget — see expectedvalue.spec.ts.

import { useState, type CSSProperties } from "react";
import type { WidgetProps } from "./types";
import { blankExpectedValueData, expectedValueSpec, type ExpectedValueRow } from "./expectedvalue.spec";

const ACCENT = "var(--vizithink-accent-soft)";

export function ExpectedValueWidget({ onSend, onRemove }: WidgetProps) {
  const blank = blankExpectedValueData("");
  const [title, setTitle] = useState(blank.title);
  const [rows, setRows] = useState<ExpectedValueRow[]>(blank.rows);
  const [sent, setSent] = useState(false);

  const bump = () => setSent(false);

  const patch = (i: number, p: Partial<ExpectedValueRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const add = () => setRows((r) => [...r, { outcome: "", probability: "", value: "" }]);
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const hasContent = rows.some((x) => x.outcome.trim() || x.probability.trim() || x.value.trim());

  const send = () => {
    if (!hasContent) return;
    const data = { title, rows };
    onSend({ type: expectedValueSpec.type, data, text: expectedValueSpec.format(data) });
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
        <span style={{ fontSize: 13 }}>∑</span>
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
      <div style={{ padding: "8px 10px", overflowX: "auto" }}>
        <div style={{ display: "flex", fontSize: 10, color: "var(--vizithink-text-subtle)", marginBottom: 4, gap: 4 }}>
          <span style={{ flex: 2 }}>Outcome</span>
          <span style={{ flex: 1 }}>P</span>
          <span style={{ flex: 1 }}>Value</span>
          <span style={{ width: 22 }} />
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
            <input
              value={r.outcome}
              placeholder="Outcome"
              onChange={(e) => {
                patch(i, { outcome: e.target.value });
                bump();
              }}
              style={{ ...cell, flex: 2 }}
            />
            <input
              value={r.probability}
              placeholder="0.3"
              onChange={(e) => {
                patch(i, { probability: e.target.value });
                bump();
              }}
              style={{ ...cell, flex: 1 }}
            />
            <input
              value={r.value}
              placeholder="100"
              onChange={(e) => {
                patch(i, { value: e.target.value });
                bump();
              }}
              style={{ ...cell, flex: 1 }}
            />
            <button type="button" onClick={() => remove(i)} style={iconBtnSmall}>
              −
            </button>
          </div>
        ))}
        <button type="button" onClick={add} style={addBtn}>
          + row
        </button>
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

const cell: CSSProperties = {
  padding: "5px 6px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text)",
  outline: "none",
  minWidth: 0,
};

const addBtn: CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px dashed var(--vizithink-border)",
  background: "transparent",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
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

const iconBtnSmall: CSSProperties = { ...iconBtn, width: 22, color: "var(--vizithink-text-subtle)" };

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
