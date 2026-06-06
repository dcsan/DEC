// Standalone <Name> widget for the chat view. No react-flow, no shared store —
// it owns its data in local state and, on "Send", formats it via the spec and
// hands the result (structured + text) back to the chat through `onSend`.
//
// Rename this file to `<name>Widget.tsx` and replace every Foo/foo.

import { useState } from "react";
import type { WidgetProps } from "./types";
import { blankFooData, fooSpec, type FooItem } from "./foo.spec";

// One tint per widget for the card border + header icon. Pick an unused
// --dec-* node tint (concept/framework/option/merged). See references/contract.md.
const ACCENT = "var(--dec-option)";

export function FooWidget({ initial, onSend, onRemove }: WidgetProps) {
  const [title, setTitle] = useState(initial?.title || "Foo");
  // Honor the router's prefill: map each extracted choice into a row, else seed
  // blank rows. Interpret `initial.items` in this widget's own terms.
  const [items, setItems] = useState<FooItem[]>(() =>
    initial?.items?.length
      ? initial.items.map((text) => ({ text }))
      : blankFooData(title).items,
  );
  // Whether the current data has been posted — drives the "Sent ✓" state.
  // Every edit clears it so the widget stays live and re-sendable.
  const [sent, setSent] = useState(false);

  // Route ALL mutations through this so edits always re-arm the Send button.
  const edit = (next: FooItem[]) => {
    setItems(next);
    setSent(false);
  };

  const patch = (i: number, p: Partial<FooItem>) =>
    edit(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  const addRow = () => edit([...items, { text: "" }]);
  const removeRow = (i: number) => edit(items.filter((_, idx) => idx !== i));

  const hasContent = items.some((it) => it.text.trim() !== "");

  const send = () => {
    if (!hasContent) return;
    const data = { title, items };
    // Always send BOTH forms, and always build text via the spec's format().
    onSend({ type: fooSpec.type, data, text: fooSpec.format(data) });
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
      {/* Header */}
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
        <span style={{ fontSize: 13 }}>◧</span>
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

      {/* Body — replace with the widget-specific UI */}
      <div style={{ padding: "6px 10px" }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <input
              value={it.text}
              placeholder={`Item ${i + 1}`}
              onChange={(e) => patch(i, { text: e.target.value })}
              style={rowInput}
            />
            <button
              type="button"
              title="Remove row"
              onClick={() => removeRow(i)}
              style={{ ...iconBtn, width: 22, color: "var(--dec-text-subtle)" }}
            >
              −
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow} style={addRowBtn}>
          + add item
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
