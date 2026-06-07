// Pre-mortem widget — see premortem.spec.ts.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import { blankPremortemData, premortemSpec } from "./premortem.spec";

const ACCENT = "var(--dec-framework)";

export function PremortemWidget({ initial, onSend, onRemove }: WidgetProps) {
  const blank = blankPremortemData(initial?.title || "");
  const [title, setTitle] = useState(blank.title);
  const [decision, setDecision] = useState(blank.decision);
  const [horizon, setHorizon] = useState(blank.horizon);
  const [imaginedFailure, setImaginedFailure] = useState(blank.imaginedFailure);
  const [causes, setCauses] = useState(blank.causes);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = trpc.premortem.suggest.useMutation();

  const bump = () => {
    setSent(false);
    setError(null);
  };

  // The decision to seed the LLM with: the Decision field if typed, else what
  // surfaced this widget.
  const seedQuestion = () =>
    decision.trim() || initial?.question?.trim() || initial?.title?.trim() || "";

  // Draft (or redraft) all four pre-mortem fields from the decision.
  const runSuggest = async () => {
    const q = seedQuestion();
    if (!q || suggest.isPending) return;
    setError(null);
    try {
      const out = await suggest.mutateAsync({ question: q });
      setDecision(out.decision);
      setHorizon(out.horizon);
      setImaginedFailure(out.imaginedFailure);
      setCauses(out.causes);
      setSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the pre-mortem.");
    }
  };

  // Surfaced with a decision already → draft the pre-mortem once on mount.
  const autofilled = useRef(false);
  useEffect(() => {
    if (autofilled.current) return;
    autofilled.current = true;
    if (initial?.question?.trim() || initial?.title?.trim()) void runSuggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasContent = Boolean(
    decision.trim() || horizon.trim() || imaginedFailure.trim() || causes.trim(),
  );

  const send = () => {
    if (!hasContent) return;
    const data = { title, decision, horizon, imaginedFailure, causes };
    onSend({ type: premortemSpec.type, data, text: premortemSpec.format(data) });
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
          borderBottom: "1px solid var(--dec-border-soft)",
          background: "var(--dec-surface)",
        }}
      >
        <span style={{ fontSize: 13 }}>☠</span>
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
          {suggest.isPending ? "Thinking…" : error ? error : "Let AI draft the pre-mortem."}
        </span>
        <button
          type="button"
          onClick={runSuggest}
          disabled={!seedQuestion() || suggest.isPending}
          style={suggestBtn(!!seedQuestion() && !suggest.isPending)}
        >
          {hasContent ? "↻ Regenerate" : "✨ Suggest"}
        </button>
      </div>

      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Decision" value={decision} onChange={setDecision} bump={bump} ph="What you're about to do…" />
        <Field label="Time horizon" value={horizon} onChange={setHorizon} bump={bump} ph="e.g. 12 months from now" />
        <Area label="Imagined failure" value={imaginedFailure} onChange={setImaginedFailure} bump={bump} ph="It's failed — what happened?" />
        <Area label="Causes (working backwards)" value={causes} onChange={setCauses} bump={bump} ph="Chain of causes leading to that failure…" />
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

function Field(props: { label: string; value: string; onChange: (v: string) => void; bump: () => void; ph: string }) {
  return (
    <label style={lab}>
      <span style={labT}>{props.label}</span>
      <input
        value={props.value}
        placeholder={props.ph}
        onChange={(e) => {
          props.onChange(e.target.value);
          props.bump();
        }}
        style={inp}
      />
    </label>
  );
}

function Area(props: { label: string; value: string; onChange: (v: string) => void; bump: () => void; ph: string }) {
  return (
    <label style={lab}>
      <span style={labT}>{props.label}</span>
      <textarea
        value={props.value}
        placeholder={props.ph}
        onChange={(e) => {
          props.onChange(e.target.value);
          props.bump();
        }}
        rows={3}
        style={ta}
      />
    </label>
  );
}

function shell(accent: string): CSSProperties {
  return {
    width: "100%",
    maxWidth: 840,
    borderRadius: 12,
    background: "var(--dec-surface-2)",
    border: `1.5px solid ${accent}`,
    boxShadow: "0 1px 2px #0006",
    color: "var(--dec-text)",
    overflow: "hidden",
  };
}

const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labT: CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--dec-text-subtle)" };
const inp: CSSProperties = {
  padding: "6px 8px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  color: "var(--dec-text)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const ta: CSSProperties = { ...inp, resize: "vertical", fontFamily: "inherit", minHeight: 64 };

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

const suggestBtn = (enabled: boolean): CSSProperties => ({
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
