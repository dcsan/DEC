// Standalone 2×2 grid: four text fields in a fixed layout; drag a tile's handle
// onto another tile to swap their contents. On send, formats via twobytwo.spec.ts.

import { useState, type CSSProperties, type DragEvent } from "react";
import type { WidgetProps } from "./types";
import { blankTwoByTwoData, twoByTwoSpec, type TwoByTwoCells } from "./twobytwo.spec";

const ACCENT = "var(--dec-framework)";

const LABELS = ["TL", "TR", "BL", "BR"] as const;

function swapCells(cells: TwoByTwoCells, from: number, to: number): TwoByTwoCells {
  if (from === to) return cells;
  const next = [...cells] as [string, string, string, string];
  const t = next[from]!;
  next[from] = next[to]!;
  next[to] = t;
  return next;
}

export function TwoByTwoWidget({ onSend, onRemove }: WidgetProps) {
  const [title, setTitle] = useState(() => blankTwoByTwoData("").title);
  const [cells, setCells] = useState<TwoByTwoCells>(() => blankTwoByTwoData("").cells);
  const [sent, setSent] = useState(false);

  const patchCell = (i: number, value: string) => {
    setCells((cur) => {
      const next = [...cur] as [string, string, string, string];
      next[i] = value;
      return next;
    });
    setSent(false);
  };

  const onDropOn = (targetIndex: number) => (e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-twobytwo-index");
    const from = parseInt(raw, 10);
    if (Number.isNaN(from) || from < 0 || from > 3) return;
    setCells((cur) => swapCells(cur, from, targetIndex));
    setSent(false);
  };

  const hasContent = cells.some((c) => c.trim() !== "");

  const send = () => {
    if (!hasContent) return;
    const data = { title, cells };
    onSend({ type: twoByTwoSpec.type, data, text: twoByTwoSpec.format(data) });
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
        <span style={{ fontSize: 13 }}>⊞</span>
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

      <p
        style={{
          margin: "6px 10px 0",
          fontSize: 11,
          color: "var(--dec-text-subtle)",
        }}
      >
        Drag <strong>⠿</strong> onto another cell to swap text.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          padding: "10px 10px 6px",
        }}
      >
        {LABELS.map((label, i) => (
          <div
            key={i}
            data-twobytwo-cell={i}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={onDropOn(i)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: 8,
              borderRadius: 8,
              border: "1px solid var(--dec-border)",
              background: "var(--dec-surface)",
              minHeight: 72,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                title="Drag to swap with another cell"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-twobytwo-index", String(i));
                  e.dataTransfer.effectAllowed = "move";
                }}
                style={{
                  cursor: "grab",
                  fontSize: 14,
                  lineHeight: 1,
                  userSelect: "none",
                  color: "var(--dec-text-muted)",
                }}
              >
                ⠿
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--dec-text-subtle)" }}>
                {label}
              </span>
            </div>
            <textarea
              value={cells[i]}
              placeholder={`Quadrant ${label}`}
              onChange={(e) => patchCell(i, e.target.value)}
              rows={2}
              style={{
                width: "100%",
                resize: "vertical",
                minHeight: 40,
                padding: "5px 7px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--dec-border-soft)",
                background: "var(--dec-surface-2)",
                color: "var(--dec-text)",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
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
          <span
            style={{
              alignSelf: "center",
              marginRight: 10,
              fontSize: 12,
              color: "var(--dec-merged)",
            }}
          >
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
