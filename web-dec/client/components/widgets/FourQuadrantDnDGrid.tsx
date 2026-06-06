// Reusable 2×2 drag-swap grid for chat widgets (see quadrant4Types.ts).

import { useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import type { WidgetProps, WidgetSpec } from "./types";
import type { FourCells, Quadrant4Data } from "./quadrant4Types";

/** Card border tint — pick a distinct `--dec-*` per widget (see references/contract.md). */
const DEFAULT_ACCENT = "var(--dec-framework)";

function swapCells(cells: FourCells, from: number, to: number): FourCells {
  if (from === to) return cells;
  const next = [...cells] as [string, string, string, string];
  const t = next[from]!;
  next[from] = next[to]!;
  next[to] = t;
  return next;
}

export interface FourQuadrantDnDGridProps extends WidgetProps {
  /** Unique per widget so drag payloads never collide between widget types. */
  dndMime: string;
  spec: WidgetSpec<Quadrant4Data>;
  initialTitle: string;
  initialCells: FourCells;
  /** Short labels shown on each tile (e.g. TL or "Do first"). */
  quadrantLabels: readonly [string, string, string, string];
  headerEmoji: string;
  hint: ReactNode;
  /** Border + shell accent; default matches Pros & Cons style. */
  accent?: string;
}

export function FourQuadrantDnDGrid({
  dndMime,
  spec,
  initialTitle,
  initialCells,
  quadrantLabels,
  headerEmoji,
  hint,
  accent = DEFAULT_ACCENT,
  onSend,
  onRemove,
}: FourQuadrantDnDGridProps) {
  const [title, setTitle] = useState(initialTitle);
  const [cells, setCells] = useState<FourCells>(initialCells);
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
    const raw = e.dataTransfer.getData(dndMime);
    const from = parseInt(raw, 10);
    if (Number.isNaN(from) || from < 0 || from > 3) return;
    setCells((cur) => swapCells(cur, from, targetIndex));
    setSent(false);
  };

  const hasContent = cells.some((c) => c.trim() !== "");

  const send = () => {
    if (!hasContent) return;
    const data: Quadrant4Data = { title, cells };
    onSend({ type: spec.type, data, text: spec.format(data) });
    setSent(true);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 460,
        borderRadius: 12,
        background: "var(--dec-surface-2)",
        border: `1.5px solid ${accent}`,
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
        <span style={{ fontSize: 13 }}>{headerEmoji}</span>
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
        {hint}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          padding: "10px 10px 6px",
        }}
      >
        {quadrantLabels.map((label, i) => (
          <div
            key={i}
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
                  e.dataTransfer.setData(dndMime, String(i));
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
              placeholder={label}
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
