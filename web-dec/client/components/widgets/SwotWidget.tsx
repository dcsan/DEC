// SWOT widget — a 2×2 canvas of draggable bubbles (see swot.spec.ts).
//
// Like the 2×2 axes widget, this is a plane split by a crosshair into four
// quadrants — Strengths (top-left), Weaknesses (top-right), Opportunities
// (bottom-left), Threats (bottom-right). Each SWOT point is a single bubble the
// user drags anywhere; the quadrant it lands in IS its category. Dragging a
// bubble across the crosshair recategorises it. Each bubble has an ⓘ button that
// asks the server why that item belongs in its quadrant and posts the answer to
// chat. On Send the bubbles are grouped back into the four cells the spec formats.
//
// Dragging uses pointer events (not HTML5 DnD) so a bubble can rest anywhere.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import type { FourCells } from "./quadrant4Types";
import { blankSwotData, swotSpec, type SwotData } from "./swot.spec";

type QuadName = "Strengths" | "Weaknesses" | "Opportunities" | "Threats";

// Quadrant index ⇄ layout: 0 = top-left, 1 = top-right, 2 = bottom-left,
// 3 = bottom-right (matches the SwotData cells order S, W, O, T).
const QUADRANTS: { name: QuadName; color: string }[] = [
  { name: "Strengths", color: "var(--vizithink-merged)" },
  { name: "Weaknesses", color: "var(--vizithink-option)" },
  { name: "Opportunities", color: "var(--vizithink-concept)" },
  { name: "Threats", color: "var(--vizithink-framework)" },
];

const SINGULAR: Record<QuadName, string> = {
  Strengths: "strength",
  Weaknesses: "weakness",
  Opportunities: "opportunity",
  Threats: "threat",
};

interface Bubble {
  id: string;
  text: string;
  x: number; // 0-100, left→right
  y: number; // 0-100, top→bottom
}

const uid = () => crypto.randomUUID();
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
// The quadrant a position falls in (origin top-left, crosshair at 50/50).
const quadOf = (x: number, y: number) => (y < 50 ? 0 : 2) + (x < 50 ? 0 : 1);

// Spread a quadrant's points around its centre, staggered so they overlap less.
function placeInQuad(qi: number, i: number, n: number) {
  const cx = qi % 2 === 0 ? 26 : 74; // left column : right column
  const top = qi < 2;
  const yStart = top ? 15 : 60;
  const yEnd = top ? 40 : 85;
  const y = n <= 1 ? (top ? 27 : 73) : yStart + ((yEnd - yStart) * i) / (n - 1);
  const x = cx + (i % 2 === 0 ? -7 : 7);
  return { x: clamp(x, 5, 95), y: clamp(y, 5, 95) };
}

export function SwotWidget({ initial, onSend, onRemove, onMessage }: WidgetProps) {
  const seedQuestion = () => initial?.question?.trim() || initial?.title?.trim() || "";
  const [title, setTitle] = useState(blankSwotData(initial?.title?.trim() || seedQuestion()).title);
  const [items, setItems] = useState<Bubble[]>([]);
  const [newText, setNewText] = useState("");
  const [newQuad, setNewQuad] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planeRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const suggest = trpc.swot.suggest.useMutation();
  const explain = trpc.swot.explain.useMutation();

  const dirty = () => {
    setSent(false);
    setError(null);
  };

  // Pointer position → 0-100 plane coords (origin top-left), kept just inside the
  // edges so a centred bubble never spills out.
  const pointerToPos = (clientX: number, clientY: number) => {
    const rect = planeRef.current!.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 3, 97),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 3, 97),
    };
  };

  useEffect(() => {
    if (drag == null) return;
    const onMove = (e: PointerEvent) => {
      const { x, y } = pointerToPos(e.clientX, e.clientY);
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

  // On mount, if routed in with a subject, draft all four quadrants so the user
  // reacts to a populated board rather than an empty plane.
  const autofilled = useRef(false);
  useEffect(() => {
    if (autofilled.current) return;
    autofilled.current = true;
    const q = seedQuestion();
    if (!q) return;
    void (async () => {
      setError(null);
      try {
        const out = await suggest.mutateAsync({ question: q });
        const byQuad = [out.strengths, out.weaknesses, out.opportunities, out.threats];
        const fresh: Bubble[] = [];
        byQuad.forEach((points, qi) => {
          points.forEach((text, i) => {
            const { x, y } = placeInQuad(qi, i, points.length);
            fresh.push({ id: uid(), text, x, y });
          });
        });
        setItems(fresh);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not draft the SWOT.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = () => {
    const text = newText.trim();
    if (!text) return;
    const { x, y } = placeInQuad(newQuad, 1, 3); // drop near the chosen quadrant's centre
    setItems((cur) => [...cur, { id: uid(), text, x, y }]);
    setNewText("");
    dirty();
  };

  const removeItem = (i: number) => {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
    dirty();
  };

  // ⓘ button: ask the server why this item sits in its current quadrant, then
  // post the write-up into the chat below the widget.
  const explainItem = async (i: number) => {
    const it = items[i];
    if (!it || !it.text.trim() || explain.isPending) return;
    const quadrant = QUADRANTS[quadOf(it.x, it.y)]!.name;
    const q = seedQuestion() || title.trim();
    onMessage?.(`ⓘ Why is **${it.text.trim()}** a ${SINGULAR[quadrant]}?`, {
      role: "user",
    });
    try {
      const out = await explain.mutateAsync({ question: q, item: it.text.trim(), quadrant });
      onMessage?.(out.explanation);
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : "Could not explain that item.", {
        markdown: false,
      });
    }
  };

  // Group the bubbles back into the four cells the spec formats (one point per
  // line within its quadrant), then post the structured + text rendering to chat.
  const buildCells = (): FourCells => {
    const groups: string[][] = [[], [], [], []];
    for (const it of items) {
      const t = it.text.trim();
      if (t) groups[quadOf(it.x, it.y)]!.push(t);
    }
    return groups.map((g) => g.join("\n")) as unknown as FourCells;
  };

  const hasContent = items.some((it) => it.text.trim() !== "");

  const send = () => {
    if (!hasContent) return;
    const data: SwotData = { title: title.trim() || "SWOT", cells: buildCells() };
    onSend({ type: swotSpec.type, data, text: swotSpec.format(data) });
    setSent(true);
  };

  return (
    <div style={shell}>
      {/* Header */}
      <div style={headerRow}>
        <span style={{ fontSize: 13 }}>◇</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            dirty();
          }}
          placeholder="Subject of the SWOT"
          style={titleInput}
        />
        <button type="button" title="Remove widget" onClick={onRemove} style={iconBtn}>
          ⨯
        </button>
      </div>

      {/* Status line */}
      <div style={statusBar}>
        <span style={{ fontSize: 11, color: error ? "#ff8b8b" : "var(--vizithink-text-subtle)" }}>
          {suggest.isPending
            ? "Drafting the four quadrants…"
            : error
              ? error
              : "Drag a point anywhere; drop it across the lines to recategorise. ⓘ explains why it's there."}
        </span>
      </div>

      {/* The plane: crosshair + quadrant labels + draggable bubbles */}
      <div style={{ padding: "10px 10px 0" }}>
        <div ref={planeRef} style={plane}>
          <div style={crosshairV} />
          <div style={crosshairH} />

          {/* corner labels */}
          {QUADRANTS.map((qd, qi) => (
            <div
              key={qd.name}
              style={{
                ...quadLabel,
                color: qd.color,
                ...(qi % 2 === 0 ? { left: 8 } : { right: 8 }),
                ...(qi < 2 ? { top: 6 } : { bottom: 6 }),
                textAlign: qi % 2 === 0 ? "left" : "right",
              }}
            >
              {qd.name}
            </div>
          ))}

          {items.map((it, i) => {
            const color = QUADRANTS[quadOf(it.x, it.y)]!.color;
            return (
              <div
                key={it.id}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDrag(i);
                }}
                title={`${it.text} — drag to move`}
                style={{
                  ...bubble,
                  left: `${it.x}%`,
                  top: `${it.y}%`,
                  borderColor: color,
                  cursor: drag === i ? "grabbing" : "grab",
                  zIndex: drag === i ? 5 : 1,
                }}
              >
                <span style={{ flex: 1 }}>{it.text}</span>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    void explainItem(i);
                  }}
                  disabled={explain.isPending}
                  title="Why is this here?"
                  style={{ ...bubbleIcon, color }}
                >
                  ⓘ
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(i);
                  }}
                  title="Remove"
                  style={bubbleIcon}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add a point */}
      <div style={{ display: "flex", gap: 6, padding: "10px" }}>
        <select
          value={newQuad}
          onChange={(e) => setNewQuad(Number(e.target.value))}
          style={selectInput}
          title="Quadrant for the new point"
        >
          {QUADRANTS.map((qd, qi) => (
            <option key={qd.name} value={qi}>
              {qd.name}
            </option>
          ))}
        </select>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add a point…"
          style={addInput}
        />
        <button type="button" onClick={addItem} disabled={!newText.trim()} style={addBtn}>
          + add
        </button>
      </div>

      {/* Footer */}
      <div style={footerRow}>
        {sent && <span style={{ marginRight: 10, fontSize: 12, color: "var(--vizithink-merged)" }}>Sent ✓</span>}
        <button type="button" onClick={send} disabled={!hasContent} style={sendBtn(hasContent)}>
          {sent ? "Send again ↩" : "Send to chat ↩"}
        </button>
      </div>
    </div>
  );
}

const ACCENT = "var(--vizithink-option)";

const shell: CSSProperties = {
  width: "100%",
  maxWidth: 840,
  borderRadius: 12,
  background: "var(--vizithink-surface-2)",
  border: `1.5px solid ${ACCENT}`,
  boxShadow: "0 1px 2px #0006",
  color: "var(--vizithink-text)",
  overflow: "hidden",
};

const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderBottom: "1px solid var(--vizithink-border-soft)",
  background: "var(--vizithink-surface)",
};

const titleInput: CSSProperties = {
  flex: 1,
  fontSize: 13,
  fontWeight: 600,
  border: "none",
  background: "transparent",
  color: "var(--vizithink-text)",
  outline: "none",
};

const statusBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "6px 10px",
  borderBottom: "1px solid var(--vizithink-border-soft)",
};

const plane: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  borderRadius: 8,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  touchAction: "none",
  overflow: "hidden",
};

const crosshairV: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: 0,
  bottom: 0,
  width: 1,
  background: "var(--vizithink-border)",
};
const crosshairH: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: 0,
  right: 0,
  height: 1,
  background: "var(--vizithink-border)",
};

const quadLabel: CSSProperties = {
  position: "absolute",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  opacity: 0.8,
  pointerEvents: "none",
};

const bubble: CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  maxWidth: 160,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.25,
  borderRadius: 10,
  border: "1.5px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-text)",
  userSelect: "none",
  boxShadow: "0 1px 3px #0005",
};

const bubbleIcon: CSSProperties = {
  flexShrink: 0,
  fontSize: 11,
  lineHeight: 1,
  border: "none",
  background: "transparent",
  color: "var(--vizithink-text-subtle)",
  cursor: "pointer",
  padding: 0,
};

const selectInput: CSSProperties = {
  fontSize: 12,
  padding: "5px 6px",
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text)",
  outline: "none",
  flexShrink: 0,
};

const addInput: CSSProperties = {
  flex: 1,
  padding: "5px 7px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text)",
  outline: "none",
};

const addBtn: CSSProperties = {
  fontSize: 11,
  padding: "3px 10px",
  borderRadius: 6,
  border: "1px dashed var(--vizithink-border)",
  background: "transparent",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const footerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: "8px 10px",
  borderTop: "1px solid var(--vizithink-border-soft)",
  background: "var(--vizithink-surface)",
};

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
