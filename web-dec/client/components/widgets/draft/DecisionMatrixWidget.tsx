// Decision matrix widget — see decisionmatrix.spec.ts.

import { useState, type CSSProperties } from "react";
import { trpc } from "../../../lib/trpc";
import type { WidgetProps } from "../types";
import {
  blankDecisionMatrixData,
  decisionMatrixSpec,
  type Criterion,
  type MatrixOption,
} from "./decisionmatrix.spec";

const ACCENT = "var(--vizithink-framework)";

export function DecisionMatrixWidget({ initial, onSend, onRemove }: WidgetProps) {
  const blank = blankDecisionMatrixData(initial?.title || "", initial?.items);
  const [title, setTitle] = useState(blank.title);
  const [criteria, setCriteria] = useState<Criterion[]>(blank.criteria);
  const [options, setOptions] = useState<MatrixOption[]>(blank.options);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const more = trpc.suggest.more.useMutation();

  const bump = () => {
    setSent(false);
    setError(null);
  };

  // The decision to seed the LLM with: what surfaced this widget, else the title.
  const seedQuestion = () => initial?.question?.trim() || title.trim();

  // Append more options (rows) from the LLM, scored blank for the user to fill.
  const generateMore = async () => {
    const q = seedQuestion();
    if (!q || more.isPending) return;
    setError(null);
    try {
      const out = await more.mutateAsync({
        question: q,
        itemNoun: "option to compare",
        existing: options.map((o) => o.name.trim()).filter(Boolean),
      });
      if (out.items.length) {
        setOptions((cur) => [
          ...cur,
          ...out.items.map((name) => ({ name, scores: criteria.map(() => "") })),
        ]);
        setSent(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate more.");
    }
  };

  const patchCrit = (i: number, p: Partial<Criterion>) => {
    setCriteria((c) => c.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
    bump();
  };

  const addCrit = () => {
    setCriteria((c) => [...c, { name: "", weight: "1" }]);
    setOptions((o) => o.map((row) => ({ ...row, scores: [...row.scores, ""] })));
    bump();
  };

  const removeCrit = (i: number) => {
    setCriteria((c) => c.filter((_, idx) => idx !== i));
    setOptions((o) => o.map((row) => ({ ...row, scores: row.scores.filter((_, idx) => idx !== i) })));
    bump();
  };

  const patchOpt = (i: number, p: Partial<MatrixOption>) => {
    setOptions((o) => o.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
    bump();
  };

  const patchScore = (optI: number, critI: number, v: string) => {
    setOptions((o) =>
      o.map((row, idx) => {
        if (idx !== optI) return row;
        const scores = [...row.scores];
        scores[critI] = v;
        return { ...row, scores };
      }),
    );
    bump();
  };

  const addOpt = () => {
    setOptions((o) => [...o, { name: "", scores: criteria.map(() => "") }]);
    bump();
  };

  const removeOpt = (i: number) => {
    setOptions((o) => o.filter((_, idx) => idx !== i));
    bump();
  };

  const hasContent =
    criteria.some((c) => c.name.trim()) && options.some((o) => o.name.trim());

  const send = () => {
    if (!hasContent) return;
    const data = { title, criteria, options };
    onSend({ type: decisionMatrixSpec.type, data, text: decisionMatrixSpec.format(data) });
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
        <span style={{ fontSize: 13 }}>▦</span>
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
      <p style={{ margin: "6px 10px 0", fontSize: 11, color: "var(--vizithink-text-subtle)" }}>
        Criteria (with weights) as columns; each row is an option to score.
      </p>

      <div style={{ overflowX: "auto", padding: "8px 10px" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%", minWidth: 280 }}>
          <thead>
            <tr>
              <th style={th}>Option</th>
              {criteria.map((c, j) => (
                <th key={j} style={th}>
                  <input value={c.name} placeholder={`C${j + 1}`} onChange={(e) => patchCrit(j, { name: e.target.value })} style={cellInp} />
                  <input
                    value={c.weight}
                    placeholder="w"
                    title="Weight"
                    onChange={(e) => patchCrit(j, { weight: e.target.value })}
                    style={{ ...cellInp, marginTop: 4, width: "100%" }}
                  />
                  {criteria.length > 1 && (
                    <button type="button" onClick={() => removeCrit(j)} style={miniX}>
                      ×
                    </button>
                  )}
                </th>
              ))}
              <th style={{ ...th, width: 28 }} />
            </tr>
          </thead>
          <tbody>
            {options.map((o, i) => (
              <tr key={i}>
                <td style={td}>
                  <input
                    value={o.name}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) => patchOpt(i, { name: e.target.value })}
                    style={cellInp}
                  />
                </td>
                {criteria.map((_, j) => (
                  <td key={j} style={td}>
                    <input
                      value={o.scores[j] ?? ""}
                      placeholder="0"
                      onChange={(e) => patchScore(i, j, e.target.value)}
                      style={cellInp}
                    />
                  </td>
                ))}
                <td style={td}>
                  {options.length > 1 && (
                    <button type="button" onClick={() => removeOpt(i)} style={miniX}>
                      −
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={addCrit} style={addBtn}>
            + criterion
          </button>
          <button type="button" onClick={addOpt} style={addBtn}>
            + option
          </button>
          <button
            type="button"
            onClick={generateMore}
            disabled={!seedQuestion() || more.isPending}
            style={genBtn(!!seedQuestion() && !more.isPending)}
          >
            {more.isPending ? "Thinking…" : "✨ generate options"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--vizithink-option)" }}>{error}</div>
        )}
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

const th: CSSProperties = {
  border: "1px solid var(--vizithink-border)",
  padding: 4,
  verticalAlign: "top",
  textAlign: "left",
  background: "var(--vizithink-surface)",
};
const td: CSSProperties = { border: "1px solid var(--vizithink-border)", padding: 4, verticalAlign: "middle" };
const cellInp: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "4px 5px",
  fontSize: 11,
  borderRadius: 4,
  border: "1px solid var(--vizithink-border-soft)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-text)",
  outline: "none",
};

const miniX: CSSProperties = {
  marginTop: 4,
  fontSize: 10,
  border: "none",
  background: "transparent",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
};

const addBtn: CSSProperties = {
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px dashed var(--vizithink-border)",
  background: "transparent",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
};

const genBtn = (enabled: boolean): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: enabled ? "var(--vizithink-accent-soft)" : "var(--vizithink-surface)",
  color: enabled ? "var(--vizithink-text)" : "var(--vizithink-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
  whiteSpace: "nowrap",
});

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
