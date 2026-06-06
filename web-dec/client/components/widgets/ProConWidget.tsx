// Standalone Pros & Cons widget for the chat view. No react-flow, no server —
// it owns its rows in local state and, on "Send", formats them via the spec
// (procon.spec.ts) and hands the text back to the chat through `onSend`.

import { useState } from "react";
import type { WidgetProps } from "./types";
import { blankProConData, proConSpec, type ProConItem } from "./procon.spec";

const ACCENT = "var(--dec-framework)";

export function ProConWidget({ initial, onSend, onRemove }: WidgetProps) {
  const [title, setTitle] = useState(initial?.title || "Pros & Cons");
  const [items, setItems] = useState<ProConItem[]>(() =>
    // Prefill each choice from the router as its own row; otherwise blank rows.
    initial?.items?.length
      ? initial.items.map((text) => ({ text, pro: false, con: false }))
      : blankProConData(title).items,
  );
  // Whether the current rows have already been posted, so we can show a "Sent"
  // confirmation. Any edit clears it, keeping the widget live and re-sendable.
  const [sent, setSent] = useState(false);

  const edit = (next: ProConItem[]) => {
    setItems(next);
    setSent(false);
  };

  const patch = (i: number, p: Partial<ProConItem>) =>
    edit(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)));

  const addRow = () => edit([...items, { text: "", pro: false, con: false }]);

  const removeRow = (i: number) => edit(items.filter((_, idx) => idx !== i));

  const hasContent = items.some((it) => it.text.trim() !== "");

  const send = () => {
    if (!hasContent) return;
    const data = { title, items };
    // Send both the structured payload and its plain-text rendering.
    onSend({ type: proConSpec.type, data, text: proConSpec.format(data) });
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
        <span style={{ fontSize: 13 }}>⚖︎</span>
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

      {/* Column headers */}
      <div
        style={{
          display: "flex",
          padding: "4px 10px",
          fontSize: 11,
          color: "var(--dec-text-subtle)",
        }}
      >
        <span style={{ flex: 1 }}>Item</span>
        <span style={{ width: 34, textAlign: "center" }}>Pro</span>
        <span style={{ width: 34, textAlign: "center" }}>Con</span>
        <span style={{ width: 22 }} />
      </div>

      {/* Rows */}
      <div style={{ padding: "0 10px 6px" }}>
        {items.map((it, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}
          >
            <input
              value={it.text}
              placeholder={`Item ${i + 1}`}
              onChange={(e) => patch(i, { text: e.target.value })}
              style={rowInput}
            />
            <span style={{ width: 34, textAlign: "center" }}>
              <input
                type="checkbox"
                checked={it.pro}
                onChange={(e) => patch(i, { pro: e.target.checked })}
                style={{ accentColor: "var(--dec-merged)", cursor: "pointer" }}
              />
            </span>
            <span style={{ width: 34, textAlign: "center" }}>
              <input
                type="checkbox"
                checked={it.con}
                onChange={(e) => patch(i, { con: e.target.checked })}
                style={{ accentColor: "var(--dec-option)", cursor: "pointer" }}
              />
            </span>
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
          justifyContent: "flex-end",
          padding: "8px 10px",
          borderTop: "1px solid var(--dec-border-soft)",
          background: "var(--dec-surface)",
        }}
      >
        {sent && (
          <span style={{ alignSelf: "center", marginRight: 10, fontSize: 12, color: "var(--dec-merged)" }}>
            Sent ✓
          </span>
        )}
        <button type="button" onClick={send} disabled={!hasContent} style={sendBtn(hasContent)}>
          {sent ? "Send again ↩" : "Send to chat ↩"}
        </button>
      </div>
    </div>
  );
}

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
