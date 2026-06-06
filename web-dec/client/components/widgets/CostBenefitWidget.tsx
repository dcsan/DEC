// Cost–benefit widget — see costbenefit.spec.ts.

import { useState, type CSSProperties } from "react";
import type { WidgetProps } from "./types";
import { blankCostBenefitData, costBenefitSpec, type CostBenefitLine } from "./costbenefit.spec";

const ACCENT = "var(--dec-framework)";

export function CostBenefitWidget({ onSend, onRemove }: WidgetProps) {
  const blank = blankCostBenefitData("");
  const [title, setTitle] = useState(blank.title);
  const [costs, setCosts] = useState<CostBenefitLine[]>(blank.costs);
  const [benefits, setBenefits] = useState<CostBenefitLine[]>(blank.benefits);
  const [notes, setNotes] = useState(blank.notes);
  const [sent, setSent] = useState(false);

  const bump = () => setSent(false);

  const patchCosts = (i: number, p: Partial<CostBenefitLine>) => {
    setCosts((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
    bump();
  };
  const patchBen = (i: number, p: Partial<CostBenefitLine>) => {
    setBenefits((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
    bump();
  };

  const addCost = () => setCosts((r) => [...r, { label: "", amount: "" }]);
  const addBen = () => setBenefits((r) => [...r, { label: "", amount: "" }]);
  const rmCost = (i: number) => setCosts((r) => r.filter((_, idx) => idx !== i));
  const rmBen = (i: number) => setBenefits((r) => r.filter((_, idx) => idx !== i));

  const hasContent =
    costs.some((c) => c.label.trim() || c.amount.trim()) ||
    benefits.some((b) => b.label.trim() || b.amount.trim()) ||
    notes.trim() !== "";

  const send = () => {
    if (!hasContent) return;
    const data = { title, costs, benefits, notes };
    onSend({ type: costBenefitSpec.type, data, text: costBenefitSpec.format(data) });
    setSent(true);
  };

  const section = (label: string, rows: CostBenefitLine[], patch: typeof patchCosts, add: () => void, rm: (i: number) => void) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--dec-text-subtle)" }}>{label}</div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <input
            value={row.label}
            placeholder="Item"
            onChange={(e) => patch(i, { label: e.target.value })}
            style={{ ...inp, flex: 1 }}
          />
          <input
            value={row.amount}
            placeholder="Amount"
            onChange={(e) => patch(i, { amount: e.target.value })}
            style={{ ...inp, width: 88 }}
          />
          <button type="button" onClick={() => rm(i)} style={iconBtnSmall}>
            −
          </button>
        </div>
      ))}
      <button type="button" onClick={add} style={addBtn}>
        + line
      </button>
    </div>
  );

  return (
    <div style={shell(ACCENT)}>
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
        <span style={{ fontSize: 13 }}>⚖</span>
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
            color: "var(--dec-text)",
            outline: "none",
          }}
        />
        <button type="button" title="Remove widget" onClick={onRemove} style={iconBtn}>
          ⨯
        </button>
      </div>
      <div style={{ padding: "10px 10px 0" }}>
        {section("Costs", costs, patchCosts, addCost, rmCost)}
        {section("Benefits", benefits, patchBen, addBen, rmBen)}
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--dec-text-subtle)" }}>Notes</div>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            bump();
          }}
          placeholder="Assumptions, non-quantified factors…"
          rows={2}
          style={ta}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "8px 10px",
          borderTop: "1px solid var(--dec-border-soft)",
          background: "var(--dec-surface)",
        }}
      >
        {sent && (
          <span style={{ alignSelf: "center", marginRight: 10, fontSize: 12, color: "var(--dec-merged)" }}>Sent ✓</span>
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
    maxWidth: 460,
    borderRadius: 12,
    background: "var(--dec-surface-2)",
    border: `1.5px solid ${accent}`,
    boxShadow: "0 1px 2px #0006",
    color: "var(--dec-text)",
    overflow: "hidden",
  };
}

const inp: CSSProperties = {
  padding: "5px 7px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  color: "var(--dec-text)",
  outline: "none",
  boxSizing: "border-box",
};

const ta: CSSProperties = {
  ...inp,
  width: "100%",
  resize: "vertical",
  fontFamily: "inherit",
  marginBottom: 8,
};

const addBtn: CSSProperties = {
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px dashed var(--dec-border)",
  background: "transparent",
  color: "var(--dec-text-muted)",
  cursor: "pointer",
};

const iconBtn: CSSProperties = {
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

const iconBtnSmall: CSSProperties = {
  ...iconBtn,
  width: 22,
  color: "var(--dec-text-subtle)",
};

const sendBtn = (enabled: boolean): CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: enabled ? "var(--dec-accent)" : "var(--dec-border)",
  color: enabled ? "#0f1115" : "var(--dec-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
});
