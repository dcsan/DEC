// 2×2 axes/scatter widget — see twobytwo.spec.ts.
//
// The user compares options by dragging them anywhere onto a plane whose two
// axes are derived from the decision by the LLM (trpc.axes.suggest, called once
// on mount and via the "suggest axes" button). Each placed item's position is a
// 0-100 score per axis. Unplaced options wait in a tray below the plane. On Send
// it formats via the spec and posts the scored positions back to chat.
//
// Dragging uses pointer events (not HTML5 DnD) so items can rest at ANY point,
// not just the four corners.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import {
  blankAxesGridData,
  twoByTwoSpec,
  type Axis,
  type PlacedItem,
} from "./twobytwo.spec";

const ACCENT = "var(--dec-framework)";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function TwoByTwoWidget({ initial, onSend, onRemove }: WidgetProps) {
  const seed = blankAxesGridData(initial?.title || "", initial?.question || "", initial?.items);
  const [title, setTitle] = useState(seed.title);
  const [xAxis, setXAxis] = useState<Axis>(seed.xAxis);
  const [yAxis, setYAxis] = useState<Axis>(seed.yAxis);
  const [items, setItems] = useState<PlacedItem[]>(seed.items);
  const [newItem, setNewItem] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planeRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const suggest = trpc.axes.suggest.useMutation();

  const dirty = () => {
    setSent(false);
    setError(null);
  };

  const seedQuestion = () => initial?.question?.trim() || title.trim();

  // Map a pointer position to 0-100 scores against the plane. Y is inverted so
  // the top of the plane is the axis HIGH end.
  const pointerToScore = (clientX: number, clientY: number) => {
    const rect = planeRef.current!.getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100);
    return { x, y };
  };

  // While dragging, follow the cursor — works for tray items (first move places
  // them) and placed items (repositions them).
  useEffect(() => {
    if (drag == null) return;
    const onMove = (e: PointerEvent) => {
      const { x, y } = pointerToScore(e.clientX, e.clientY);
      setItems((cur) => cur.map((it, i) => (i === drag ? { ...it, x, y } : it)));
      setSent(false);
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  // Ask the LLM for the two axes that best compare these options.
  const runSuggest = async () => {
    const q = seedQuestion();
    if (!q || suggest.isPending) return;
    setError(null);
    try {
      const out = await suggest.mutateAsync({
        question: q,
        items: items.map((it) => it.name.trim()).filter(Boolean),
      });
      setXAxis(out.xAxis);
      setYAxis(out.yAxis);
      setSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate axes.");
    }
  };

  // On mount, if we were routed in with a decision, derive the axes once.
  const autofilled = useRef(false);
  useEffect(() => {
    if (autofilled.current) return;
    autofilled.current = true;
    if (seedQuestion()) void runSuggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchX = (p: Partial<Axis>) => {
    setXAxis((a) => ({ ...a, ...p }));
    dirty();
  };
  const patchY = (p: Partial<Axis>) => {
    setYAxis((a) => ({ ...a, ...p }));
    dirty();
  };

  const addItem = () => {
    const name = newItem.trim();
    if (!name) return;
    setItems((cur) => [...cur, { name, x: null, y: null }]);
    setNewItem("");
    dirty();
  };
  const removeItem = (i: number) => {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
    dirty();
  };
  const unplace = (i: number) => {
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, x: null, y: null } : it)));
    dirty();
  };

  const placed = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.x != null && it.y != null);
  const tray = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.x == null || it.y == null);

  const hasContent = placed.some(({ it }) => it.name.trim() !== "");

  const send = () => {
    if (!hasContent) return;
    const data = { title, question: seedQuestion(), xAxis, yAxis, items };
    onSend({ type: twoByTwoSpec.type, data, text: twoByTwoSpec.format(data) });
    setSent(true);
  };

  return (
    <div style={shell}>
      {/* Header */}
      <div style={headerRow}>
        <span style={{ fontSize: 13 }}>⊞</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            dirty();
          }}
          placeholder="Title"
          style={titleInput}
        />
        <button type="button" title="Remove widget" onClick={onRemove} style={iconBtn}>
          ⨯
        </button>
      </div>

      {/* Suggest bar */}
      <div style={suggestBar}>
        <span style={{ fontSize: 11, color: "var(--dec-text-subtle)" }}>
          {suggest.isPending ? "Deriving axes…" : error ? error : "Drag each option onto the grid."}
        </span>
        <button
          type="button"
          onClick={runSuggest}
          disabled={!seedQuestion() || suggest.isPending}
          style={suggestBtn(!!seedQuestion() && !suggest.isPending)}
        >
          ✨ suggest axes
        </button>
      </div>

      {/* Plot area: narrow Y-axis controls on the left, plane on the right */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px 0" }}>
        <div style={yAxisCol}>
          <input value={yAxis.high} onChange={(e) => patchY({ high: e.target.value })} placeholder="high" style={poleInput} />
          <input value={yAxis.label} onChange={(e) => patchY({ label: e.target.value })} placeholder="Y axis" style={{ ...poleInput, fontWeight: 600 }} />
          <input value={yAxis.low} onChange={(e) => patchY({ low: e.target.value })} placeholder="low" style={poleInput} />
        </div>

        <div
          ref={planeRef}
          style={plane}
          onPointerDown={(e) => {
            // Click on empty plane: place the first tray item there.
            if (tray.length === 0 || e.target !== planeRef.current) return;
            const { x, y } = pointerToScore(e.clientX, e.clientY);
            const idx = tray[0]!.i;
            setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, x, y } : it)));
            dirty();
          }}
        >
          {/* center crosshair (reference only — not buckets) */}
          <div style={crosshairV} />
          <div style={crosshairH} />

          {placed.map(({ it, i }) => (
            <div
              key={i}
              onPointerDown={(e) => {
                e.preventDefault();
                setDrag(i);
              }}
              onDoubleClick={() => unplace(i)}
              title={`${it.name} — drag to move, double-click to send back to tray`}
              style={{
                ...chip,
                position: "absolute",
                left: `${it.x}%`,
                top: `${100 - (it.y as number)}%`,
                transform: "translate(-50%, -50%)",
                cursor: drag === i ? "grabbing" : "grab",
                borderColor: ACCENT,
              }}
            >
              {it.name}
            </div>
          ))}
        </div>
      </div>

      {/* X-axis controls under the plane */}
      <div style={xAxisRow}>
        <input value={xAxis.low} onChange={(e) => patchX({ low: e.target.value })} placeholder="low" style={{ ...poleInput, flex: 1 }} />
        <input value={xAxis.label} onChange={(e) => patchX({ label: e.target.value })} placeholder="X axis" style={{ ...poleInput, flex: 1, fontWeight: 600, textAlign: "center" }} />
        <input value={xAxis.high} onChange={(e) => patchX({ high: e.target.value })} placeholder="high" style={{ ...poleInput, flex: 1, textAlign: "right" }} />
      </div>

      {/* Tray of unplaced options + add */}
      <div style={{ padding: "8px 10px 4px" }}>
        {tray.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {tray.map(({ it, i }) => (
              <div key={i} style={{ ...chip, cursor: "grab", display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDrag(i);
                  }}
                  style={{ cursor: "grab" }}
                >
                  ⠿ {it.name}
                </span>
                <button type="button" onClick={() => removeItem(i)} style={chipX} title="Remove option">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Add an option to compare…"
            style={addInput}
          />
          <button type="button" onClick={addItem} disabled={!newItem.trim()} style={addBtn}>
            + add
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={footerRow}>
        {sent && <span style={{ marginRight: 10, fontSize: 12, color: "var(--dec-merged)" }}>Sent ✓</span>}
        <button type="button" onClick={send} disabled={!hasContent} style={sendBtn(hasContent)}>
          {sent ? "Send again ↩" : "Send to chat ↩"}
        </button>
      </div>
    </div>
  );
}

const shell: CSSProperties = {
  width: "100%",
  maxWidth: 460,
  borderRadius: 12,
  background: "var(--dec-surface-2)",
  border: `1.5px solid ${ACCENT}`,
  boxShadow: "0 1px 2px #0006",
  color: "var(--dec-text)",
  overflow: "hidden",
};

const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderBottom: "1px solid var(--dec-border-soft)",
  background: "var(--dec-surface)",
};

const titleInput: CSSProperties = {
  flex: 1,
  fontSize: 13,
  fontWeight: 600,
  border: "none",
  background: "transparent",
  color: "var(--dec-text)",
  outline: "none",
};

const suggestBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "6px 10px",
  borderBottom: "1px solid var(--dec-border-soft)",
};

const yAxisCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: 4,
  width: 60,
  flexShrink: 0,
};

const plane: CSSProperties = {
  position: "relative",
  flex: 1,
  aspectRatio: "1 / 1",
  borderRadius: 8,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  touchAction: "none",
  overflow: "hidden",
};

const crosshairV: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: 0,
  bottom: 0,
  width: 1,
  background: "var(--dec-border-soft)",
};
const crosshairH: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: 0,
  right: 0,
  height: 1,
  background: "var(--dec-border-soft)",
};

const chip: CSSProperties = {
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 999,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface-2)",
  color: "var(--dec-text)",
  userSelect: "none",
  whiteSpace: "nowrap",
};

const chipX: CSSProperties = {
  fontSize: 12,
  lineHeight: 1,
  border: "none",
  background: "transparent",
  color: "var(--dec-text-subtle)",
  cursor: "pointer",
  padding: 0,
};

const xAxisRow: CSSProperties = {
  display: "flex",
  gap: 6,
  padding: "6px 10px 0 76px",
};

const poleInput: CSSProperties = {
  padding: "3px 6px",
  fontSize: 11,
  borderRadius: 6,
  border: "1px solid var(--dec-border-soft)",
  background: "var(--dec-surface-2)",
  color: "var(--dec-text)",
  outline: "none",
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

const addInput: CSSProperties = {
  flex: 1,
  padding: "5px 7px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  color: "var(--dec-text)",
  outline: "none",
};

const addBtn: CSSProperties = {
  fontSize: 11,
  padding: "3px 10px",
  borderRadius: 6,
  border: "1px dashed var(--dec-border)",
  background: "transparent",
  color: "var(--dec-text-muted)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const footerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: "8px 10px",
  borderTop: "1px solid var(--dec-border-soft)",
  background: "var(--dec-surface)",
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
