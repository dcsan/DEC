// Decision tree widget — see decisiontree.spec.ts.
//
// When the router surfaces this with a question, it drafts the root + branches
// on mount (trpc.tree.suggest). "✨ add more" appends further branches. On Send
// the formatted tree (+ original question) goes back to chat, where the server
// turns it into a recommendation.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import { blankDecisionTreeData, decisionTreeSpec, type DecisionBranch } from "./decisiontree.spec";

const ACCENT = "var(--dec-concept)";

export function DecisionTreeWidget({ initial, onSend, onRemove }: WidgetProps) {
  const blank = blankDecisionTreeData(initial?.title || "");
  const [title, setTitle] = useState(blank.title);
  const [root, setRoot] = useState(blank.root);
  const [branches, setBranches] = useState<DecisionBranch[]>(blank.branches);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = trpc.tree.suggest.useMutation();

  // Any edit re-arms the Send button and clears a stale error.
  const bump = () => {
    setSent(false);
    setError(null);
  };

  const patch = (i: number, p: Partial<DecisionBranch>) => {
    setBranches((b) => b.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
    bump();
  };

  const add = () => {
    setBranches((b) => [...b, { condition: "", outcome: "", probability: "" }]);
    bump();
  };
  const remove = (i: number) => {
    setBranches((b) => b.filter((_, idx) => idx !== i));
    bump();
  };

  // The decision to seed the LLM with: the root if typed, else what surfaced it.
  const seedQuestion = () =>
    root.trim() || initial?.question?.trim() || initial?.title?.trim() || "";

  // Draft (or redraft) the whole tree — root + branches — from the decision.
  const runSuggest = async () => {
    const q = seedQuestion();
    if (!q || suggest.isPending) return;
    setError(null);
    try {
      const out = await suggest.mutateAsync({ question: q });
      if (out.root) setRoot(out.root);
      if (out.branches.length) setBranches(out.branches);
      setSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate branches.");
    }
  };

  // Append more branches, telling the server which conditions are already shown.
  const runMore = async () => {
    const q = seedQuestion();
    if (!q || suggest.isPending) return;
    setError(null);
    try {
      const existing = branches.map((b) => b.condition.trim()).filter(Boolean);
      const out = await suggest.mutateAsync({ question: q, existing, count: 3 });
      if (out.branches.length) setBranches((cur) => [...cur, ...out.branches]);
      setSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate more branches.");
    }
  };

  // Surfaced with a decision already → draft the tree once on mount.
  const autofilled = useRef(false);
  useEffect(() => {
    if (autofilled.current) return;
    autofilled.current = true;
    if (initial?.question?.trim() || initial?.title?.trim()) void runSuggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasContent = Boolean(
    root.trim() ||
      branches.some((b) => b.condition.trim() || b.outcome.trim() || b.probability.trim()),
  );

  const send = () => {
    if (!hasContent) return;
    const data = { title, root, branches };
    onSend({ type: decisionTreeSpec.type, data, text: decisionTreeSpec.format(data) });
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
        <span style={{ fontSize: 13 }}>🌿</span>
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
          {suggest.isPending ? "Thinking…" : error ? error : "Let AI map out the tree."}
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

      <div style={{ padding: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--dec-text-subtle)" }}>Root</div>
        <input
          value={root}
          placeholder="Starting decision or question…"
          onChange={(e) => {
            setRoot(e.target.value);
            bump();
          }}
          style={{ ...inp, marginBottom: 12 }}
        />
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "var(--dec-text-subtle)" }}>Branches</div>
        {branches.map((b, i) => (
          <div key={i} style={{ marginBottom: 8, padding: 8, borderRadius: 8, border: "1px solid var(--dec-border)" }}>
            <input
              value={b.condition}
              placeholder="Condition / fork"
              onChange={(e) => patch(i, { condition: e.target.value })}
              style={{ ...inp, marginBottom: 4 }}
            />
            <input
              value={b.outcome}
              placeholder="Outcome / next step"
              onChange={(e) => patch(i, { outcome: e.target.value })}
              style={{ ...inp, marginBottom: 4 }}
            />
            <input
              value={b.probability}
              placeholder="Probability or note (optional)"
              onChange={(e) => patch(i, { probability: e.target.value })}
              style={inp}
            />
            <button type="button" onClick={() => remove(i)} style={ghost}>
              Remove branch
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={add} style={addBtn}>
            + branch
          </button>
          <button
            type="button"
            onClick={runMore}
            disabled={!seedQuestion() || suggest.isPending}
            style={moreBtn(!!seedQuestion() && !suggest.isPending)}
          >
            ✨ add more
          </button>
        </div>
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
    maxWidth: 840,
    borderRadius: 12,
    background: "var(--dec-surface-2)",
    border: `1.5px solid ${accent}`,
    boxShadow: "0 1px 2px #0006",
    color: "var(--dec-text)",
    overflow: "hidden",
  };
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

const ghost: CSSProperties = {
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

const moreBtn = (enabled: boolean): CSSProperties => ({
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: enabled ? "var(--dec-accent-soft)" : "var(--dec-surface)",
  color: enabled ? "var(--dec-text)" : "var(--dec-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
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
