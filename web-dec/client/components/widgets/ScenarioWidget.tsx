// Scenario planning widget — see scenario.spec.ts.

import { useState, type CSSProperties } from "react";
import type { WidgetProps } from "./types";
import { blankScenarioData, scenarioSpec, type ScenarioRow } from "./scenario.spec";

const ACCENT = "var(--dec-framework)";

export function ScenarioWidget({ onSend, onRemove }: WidgetProps) {
  const blank = blankScenarioData("");
  const [title, setTitle] = useState(blank.title);
  const [scenarios, setScenarios] = useState<ScenarioRow[]>(blank.scenarios);
  const [sent, setSent] = useState(false);

  const edit = (next: ScenarioRow[]) => {
    setScenarios(next);
    setSent(false);
  };

  const patch = (i: number, p: Partial<ScenarioRow>) =>
    edit(scenarios.map((s, idx) => (idx === i ? { ...s, ...p } : s)));

  const add = () => edit([...scenarios, { name: "", implications: "" }]);
  const remove = (i: number) => edit(scenarios.filter((_, idx) => idx !== i));

  const hasContent = scenarios.some((s) => s.name.trim() || s.implications.trim());

  const send = () => {
    if (!hasContent) return;
    const data = { title, scenarios };
    onSend({ type: scenarioSpec.type, data, text: scenarioSpec.format(data) });
    setSent(true);
  };

  return (
    <div style={shell(ACCENT)}>
      <HeaderRow emoji="🔭" title={title} setTitle={setTitle} setSent={setSent} onRemove={onRemove} />
      <p style={hint}>Plausible futures and what each would mean for you.</p>
      <div style={{ padding: "0 10px 8px" }}>
        {scenarios.map((s, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid var(--dec-border)" }}>
            <input
              value={s.name}
              placeholder={`Scenario ${i + 1} name`}
              onChange={(e) => patch(i, { name: e.target.value })}
              style={{ ...inp, marginBottom: 6 }}
            />
            <textarea
              value={s.implications}
              placeholder="Implications if this future happens…"
              onChange={(e) => patch(i, { implications: e.target.value })}
              rows={3}
              style={ta}
            />
            <button type="button" onClick={() => remove(i)} style={ghostBtn}>
              Remove scenario
            </button>
          </div>
        ))}
        <button type="button" onClick={add} style={addBtn}>
          + scenario
        </button>
      </div>
      <FooterRow sent={sent} hasContent={hasContent} send={send} />
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

const hint: CSSProperties = { margin: "6px 10px 0", fontSize: 11, color: "var(--dec-text-subtle)" };

function HeaderRow(props: {
  emoji: string;
  title: string;
  setTitle: (t: string) => void;
  setSent: (v: boolean) => void;
  onRemove: () => void;
}) {
  const { emoji, title, setTitle, setSent, onRemove } = props;
  return (
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
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setSent(false);
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
  );
}

function FooterRow(props: { sent: boolean; hasContent: boolean; send: () => void }) {
  const { sent, hasContent, send } = props;
  return (
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
  );
}

const inp: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "5px 7px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  color: "var(--dec-text)",
  outline: "none",
};

const ta: CSSProperties = {
  ...inp,
  resize: "vertical",
  fontFamily: "inherit",
  minHeight: 56,
};

const ghostBtn: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  border: "none",
  background: "transparent",
  color: "var(--dec-text-muted)",
  cursor: "pointer",
};

const addBtn: CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
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
