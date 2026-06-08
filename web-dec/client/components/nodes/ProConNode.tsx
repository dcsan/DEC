import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ProConData, ProConItem } from "../../../src/db/schema";

// Data injected by Canvas.tsx onto every procon node.
export interface ProConNodeData {
  title: string;
  items: ProConItem[];
  dimmed?: boolean;
  // Fire-and-forget persistence — saves without forcing a canvas refetch so
  // the user can keep typing/toggling uninterrupted.
  onSaveData: (id: string, data: ProConData) => void;
  onRemove: (id: string) => void;
  [key: string]: unknown;
}

const ACCENT = "var(--vizithink-framework)";

function ProConNodeImpl({ id, data, selected }: NodeProps) {
  const d = data as ProConNodeData;
  const [items, setItems] = useState<ProConItem[]>(d.items);

  const save = (next: ProConItem[]) => {
    setItems(next);
    d.onSaveData(id, { items: next });
  };

  const patch = (i: number, p: Partial<ProConItem>) =>
    save(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)));

  const addRow = () => save([...items, { text: "", pro: false, con: false }]);

  return (
    <div
      className="nowheel"
      style={{
        width: 300,
        borderRadius: 12,
        background: "var(--vizithink-surface-2)",
        border: `1.5px solid ${selected ? ACCENT : "var(--vizithink-border)"}`,
        boxShadow: selected ? `0 0 0 3px ${ACCENT}33` : "0 1px 2px #0006",
        opacity: d.dimmed ? 0.25 : 1,
        color: "var(--vizithink-text)",
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: ACCENT }} />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderBottom: "1px solid var(--vizithink-border-soft)",
          background: "var(--vizithink-surface)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>⚖︎ {d.title}</span>
        {selected && (
          <button
            type="button"
            className="nodrag"
            title="Remove widget"
            onClick={(e) => {
              e.stopPropagation();
              d.onRemove(id);
            }}
            style={iconBtn}
          >
            ⨯
          </button>
        )}
      </div>

      {/* Column headers */}
      <div style={{ display: "flex", padding: "4px 10px", fontSize: 11, color: "var(--vizithink-text-subtle)" }}>
        <span style={{ flex: 1 }}>Item</span>
        <span style={{ width: 34, textAlign: "center" }}>Pro</span>
        <span style={{ width: 34, textAlign: "center" }}>Con</span>
      </div>

      {/* Rows */}
      <div style={{ padding: "0 10px 6px" }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <input
              className="nodrag"
              value={it.text}
              placeholder={`Item ${i + 1}`}
              onChange={(e) => patch(i, { text: e.target.value })}
              style={rowInput}
            />
            <span style={{ width: 34, textAlign: "center" }}>
              <input
                className="nodrag"
                type="checkbox"
                checked={it.pro}
                onChange={(e) => patch(i, { pro: e.target.checked })}
                style={{ accentColor: "var(--vizithink-merged)", cursor: "pointer" }}
              />
            </span>
            <span style={{ width: 34, textAlign: "center" }}>
              <input
                className="nodrag"
                type="checkbox"
                checked={it.con}
                onChange={(e) => patch(i, { con: e.target.checked })}
                style={{ accentColor: "var(--vizithink-option)", cursor: "pointer" }}
              />
            </span>
          </div>
        ))}

        <button type="button" className="nodrag" onClick={addRow} style={addRowBtn}>
          + add item
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: ACCENT }} />
    </div>
  );
}

const rowInput: React.CSSProperties = {
  flex: 1,
  padding: "5px 7px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text)",
  outline: "none",
};

const iconBtn: React.CSSProperties = {
  fontSize: 12,
  width: 20,
  height: 20,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "#ff8b8b",
  cursor: "pointer",
};

const addRowBtn: React.CSSProperties = {
  marginTop: 2,
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px dashed var(--vizithink-border)",
  background: "transparent",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
};

export const ProConNode = memo(ProConNodeImpl);
