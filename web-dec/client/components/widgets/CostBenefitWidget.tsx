// Cost–benefit widget — see costbenefit.spec.ts.

import { useState, type CSSProperties } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import { blankCostBenefitData, costBenefitSpec, type CostBenefitLine } from "./costbenefit.spec";

const ACCENT = "var(--dec-option)";

export function CostBenefitWidget({ initial, onSend, onRemove }: WidgetProps) {
  const blank = blankCostBenefitData(initial?.title || "");
  const [title, setTitle] = useState(blank.title);
  const [costs, setCosts] = useState<CostBenefitLine[]>(blank.costs);
  const [benefits, setBenefits] = useState<CostBenefitLine[]>(blank.benefits);
  const [notes, setNotes] = useState(blank.notes);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const more = trpc.suggest.more.useMutation();

  const bump = () => {
    setSent(false);
    setError(null);
  };

  // The decision to seed the LLM with: what surfaced this widget, else the title.
  const seedQuestion = () => initial?.question?.trim() || title.trim();

  // Append more cost or benefit lines from the LLM, keeping what's there.
  const generateMore = async (kind: "cost" | "benefit") => {
    const q = seedQuestion();
    if (!q || more.isPending) return;
    setError(null);
    const rows = kind === "cost" ? costs : benefits;
    try {
      const out = await more.mutateAsync({
        question: q,
        itemNoun: kind === "cost" ? "cost or downside" : "benefit or upside",
        existing: rows.map((r) => r.label.trim()).filter(Boolean),
      });
      if (out.items.length) {
        const lines = out.items.map((label) => ({ label, amount: "" }));
        if (kind === "cost") setCosts((r) => [...r, ...lines]);
        else setBenefits((r) => [...r, ...lines]);
        setSent(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate more.");
    }
  };

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

  const section = (label: string, rows: CostBenefitLine[], patch: typeof patchCosts, add: () => void, rm: (i: number) => void, gen: () => void) => (
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={add} style={addBtn}>
          + line
        </button>
        <button
          type="button"
          onClick={gen}
          disabled={!seedQuestion() || more.isPending}
          style={genBtn(!!seedQuestion() && !more.isPending)}
        >
          {more.isPending ? "Thinking…" : "✨ generate more"}
        </button>
      </div>
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
        {section("Costs", costs, patchCosts, addCost, rmCost, () => generateMore("cost"))}
        {section("Benefits", benefits, patchBen, addBen, rmBen, () => generateMore("benefit"))}
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
        {error && (
          <div style={{ fontSize: 11, color: "var(--dec-option)", marginBottom: 8 }}>{error}</div>
        )}
      </div>
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

const genBtn = (enabled: boolean): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: enabled ? "var(--dec-accent-soft)" : "var(--dec-surface)",
  color: enabled ? "var(--dec-text)" : "var(--dec-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
  whiteSpace: "nowrap",
});

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
