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

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import {
  blankAxesGridData,
  twoByTwoSpec,
  type Axis,
  type PlacedItem,
} from "./twobytwo.spec";

const ACCENT = "var(--vizithink-framework)";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Chips are positioned by their centre (translate(-50%,-50%)), so a score at the
// 0/100 pole would spill half a chip past the plane edge. We map the 0-100 score
// range into an inset band (INSET…100-INSET %) so options always sit inside the
// grid. The pointer→score inverse uses the same band so dragging stays accurate.
const INSET = 9;
const scoreToPct = (s: number) => INSET + (s / 100) * (100 - 2 * INSET);
const pctToScore = (p: number) => clamp(((p - INSET) / (100 - 2 * INSET)) * 100, 0, 100);

export function TwoByTwoWidget({ initial, onSend, onRemove, onMessage }: WidgetProps) {
  const seed = blankAxesGridData(initial?.title || "", initial?.question || "", initial?.items);
  const [title, setTitle] = useState(seed.title);
  const [xAxis, setXAxis] = useState<Axis>(seed.xAxis);
  const [yAxis, setYAxis] = useState<Axis>(seed.yAxis);
  const [items, setItems] = useState<PlacedItem[]>(seed.items);
  const [newItem, setNewItem] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Redo axes" settings panel: candidate dimensions from the LLM, the user's
  // picks (up to two), and an optional axis they type themselves.
  const [showSettings, setShowSettings] = useState(false);
  const [optionAxes, setOptionAxes] = useState<Axis[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [customAxis, setCustomAxis] = useState("");

  const planeRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const suggest = trpc.axes.suggest.useMutation();
  const options = trpc.axes.options.useMutation();
  const score = trpc.axes.score.useMutation();
  const generate = trpc.axes.generate.useMutation();
  const explain = trpc.axes.explain.useMutation();
  const busy = suggest.isPending || options.isPending || score.isPending || generate.isPending;

  const dirty = () => {
    setSent(false);
    setError(null);
  };

  const seedQuestion = () => initial?.question?.trim() || title.trim();

  // Map a pointer position to 0-100 scores against the plane. Y is inverted so
  // the top of the plane is the axis HIGH end.
  const pointerToScore = (clientX: number, clientY: number) => {
    const rect = planeRef.current!.getBoundingClientRect();
    const x = pctToScore(((clientX - rect.left) / rect.width) * 100);
    const y = pctToScore((1 - (clientY - rect.top) / rect.height) * 100);
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

  // Ask the LLM for the two axes that best compare these options, then — if we
  // already have options (e.g. the router seeded a choice grid for an open-ended
  // question) — score them on those axes so they land placed on the grid rather
  // than piled in the tray.
  const runSuggest = async () => {
    const q = seedQuestion();
    if (!q || suggest.isPending) return;
    setError(null);
    try {
      const names = items.map((it) => it.name.trim()).filter(Boolean);
      const out = await suggest.mutateAsync({ question: q, items: names });
      setXAxis(out.xAxis);
      setYAxis(out.yAxis);
      setSent(false);
      if (names.length > 0) {
        // Use the freshly-returned axes (state hasn't updated yet). Best-effort:
        // if scoring fails the options just stay in the tray to drag manually.
        try {
          const scored = await score.mutateAsync({
            question: q,
            items: names,
            xAxis: out.xAxis,
            yAxis: out.yAxis,
          });
          placeScores(scored.scores);
        } catch {
          /* leave unplaced — user can drag */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate axes.");
    }
  };

  const itemNames = () => items.map((it) => it.name.trim()).filter(Boolean);

  // Position the named options from a scoring result. The model is asked to copy
  // names exactly, but it often rewords them (drops a "(Cash Back)" suffix, etc.),
  // so we match leniently: exact (case-insensitive) first, then with parentheticals
  // and extra whitespace stripped. Each score is consumed once so two similar
  // names can't both grab it. Options with no match keep their current position.
  const placeScores = (scores: { name: string; x: number; y: number }[]) => {
    const norm = (s: string) =>
      s.toLowerCase().trim().replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    setItems((cur) => {
      const used = new Set<number>();
      const pick = (it: PlacedItem) => {
        let i = scores.findIndex(
          (sc, idx) => !used.has(idx) && sc.name.trim().toLowerCase() === it.name.trim().toLowerCase(),
        );
        if (i === -1) i = scores.findIndex((sc, idx) => !used.has(idx) && norm(sc.name) === norm(it.name));
        if (i === -1) return null;
        used.add(i);
        return scores[i];
      };
      return cur.map((it) => {
        const s = pick(it);
        return s ? { ...it, x: clamp(s.x, 0, 100), y: clamp(s.y, 0, 100) } : it;
      });
    });
    setSent(false);
  };

  // Open the "redo axes" panel and (first time) fetch five candidate axes.
  const toggleSettings = () => {
    const next = !showSettings;
    setShowSettings(next);
    if (next && optionAxes.length === 0 && !options.isPending) void loadOptions();
  };

  const loadOptions = async () => {
    const q = seedQuestion() || itemNames().join(" vs ");
    if (!q) return;
    setError(null);
    try {
      const out = await options.mutateAsync({ question: q, items: itemNames() });
      setOptionAxes(out.options);
      setPicks([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load axis options.");
    }
  };

  // Toggle a candidate axis, capping the selection at two.
  const togglePick = (i: number) => {
    setPicks((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : cur.length >= 2 ? cur : [...cur, i]));
  };

  // Apply the chosen axes (picked options first, then a custom one if room),
  // then re-score every option against them and place the results.
  const applyAxes = async () => {
    const chosen: Axis[] = picks.map((i) => optionAxes[i]).filter(Boolean) as Axis[];
    const custom = customAxis.trim();
    if (custom && chosen.length < 2) chosen.push({ label: custom, low: "", high: "" });
    if (chosen.length === 0) return;
    const newX = chosen[0] ?? xAxis;
    const newY = chosen[1] ?? yAxis;
    const names = itemNames();
    if (names.length === 0) {
      setXAxis(newX);
      setYAxis(newY);
      setShowSettings(false);
      return;
    }
    setError(null);
    try {
      const out = await score.mutateAsync({ question: seedQuestion(), items: names, xAxis: newX, yAxis: newY });
      setXAxis(out.xAxis);
      setYAxis(out.yAxis);
      placeScores(out.scores);
      setShowSettings(false);
      setPicks([]);
      setCustomAxis("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set axes.");
    }
  };

  // "Generate" — suggest more options in the same category as the current ones,
  // already scored on the active axes, and drop them onto the grid pre-placed.
  // If the axes aren't derived yet, derive them first so the button always works.
  const runGenerate = async () => {
    const names = itemNames();
    if (names.length === 0 || generate.isPending) return;
    setError(null);
    try {
      let gx = xAxis;
      let gy = yAxis;
      if (!hasAxes) {
        const q = seedQuestion() || names.join(" vs ");
        const ax = await suggest.mutateAsync({ question: q, items: names });
        gx = ax.xAxis;
        gy = ax.yAxis;
        setXAxis(ax.xAxis);
        setYAxis(ax.yAxis);
      }
      const out = await generate.mutateAsync({ question: seedQuestion(), items: names, xAxis: gx, yAxis: gy });
      setItems((cur) => {
        const seen = new Set(cur.map((it) => it.name.trim().toLowerCase()));
        const fresh = out.items
          .filter((it) => it.name.trim() && !seen.has(it.name.trim().toLowerCase()))
          .map((it) => ({ name: it.name.trim(), x: clamp(it.x, 0, 100), y: clamp(it.y, 0, 100) }));
        return [...cur, ...fresh];
      });
      setSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate more options.");
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

  // Add a typed option. If the axes are already set, immediately ask the LLM to
  // score this one item on them and place it on the grid (no manual drag); with
  // no axes yet it just lands in the tray.
  const addItem = async () => {
    const name = newItem.trim();
    if (!name) return;
    setItems((cur) => [...cur, { name, x: null, y: null }]);
    setNewItem("");
    dirty();
    if (!hasAxes) return;
    setError(null);
    try {
      const out = await score.mutateAsync({ question: seedQuestion(), items: [name], xAxis, yAxis });
      placeScores(out.scores);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the new option — drag it on instead.");
    }
  };
  const removeItem = (i: number) => {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
    dirty();
  };
  const unplace = (i: number) => {
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, x: null, y: null } : it)));
    dirty();
  };

  // ⓘ button: ask the server to explain this option and how it ranks on the
  // current axes, then post the write-up into the chat below the widget. The
  // request is announced as a user message so the stream shows what was asked.
  const explainItem = async (i: number) => {
    const it = items[i];
    if (!it || !it.name.trim() || explain.isPending) return;
    const q = seedQuestion() || itemNames().join(" vs ");
    const axisPair = `${xAxis.label.trim() || "X"} × ${yAxis.label.trim() || "Y"}`;
    onMessage?.(`ⓘ Tell me more about **${it.name.trim()}** — how it ranks on ${axisPair}`, {
      role: "user",
    });
    try {
      const out = await explain.mutateAsync({
        question: q,
        name: it.name.trim(),
        x: it.x,
        y: it.y,
        xAxis,
        yAxis,
        others: itemNames().filter((n) => n.toLowerCase() !== it.name.trim().toLowerCase()),
      });
      onMessage?.(out.explanation);
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : "Could not load more info on that option.", {
        markdown: false,
      });
    }
  };

  const placed = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.x != null && it.y != null);
  const tray = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.x == null || it.y == null);

  const hasContent = placed.some(({ it }) => it.name.trim() !== "");
  // Both axes named → scoring/generating on them is meaningful.
  const hasAxes = xAxis.label.trim() !== "" && yAxis.label.trim() !== "";

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

      {/* Suggest bar — status text always; the suggest button lives here until a
          few options exist, after which it moves into the "redo axes" panel. */}
      <div style={suggestBar}>
        <span style={{ fontSize: 11, color: error ? "#ff8b8b" : "var(--vizithink-text-subtle)" }}>
          {suggest.isPending
            ? "Deriving axes…"
            : options.isPending
              ? "Finding ways to compare…"
              : score.isPending
                ? "Re-scoring options…"
                : generate.isPending
                  ? "Generating options…"
                  : error
                    ? error
                    : "Drag each option onto the grid."}
        </span>
        {!hasAxes && (
          <button
            type="button"
            onClick={runSuggest}
            disabled={!seedQuestion() || busy}
            style={suggestBtn(!!seedQuestion() && !busy)}
          >
            ✨ suggest axes
          </button>
        )}
      </div>

      {/* Plot area: narrow Y-axis controls on the left, plane on the right */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px 0" }}>
        <div style={yAxisCol}>
          <AxisField value={yAxis.high} onChange={(v) => patchY({ high: v })} placeholder="high" />
          <AxisField value={yAxis.label} onChange={(v) => patchY({ label: v })} placeholder="Y axis" style={{ fontWeight: 600 }} />
          <AxisField value={yAxis.low} onChange={(v) => patchY({ low: v })} placeholder="low" />
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
                left: `${scoreToPct(it.x as number)}%`,
                top: `${100 - scoreToPct(it.y as number)}%`,
                transform: "translate(-50%, -50%)",
                cursor: drag === i ? "grabbing" : "grab",
                borderColor: ACCENT,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {it.name}
              <InfoButton onClick={() => void explainItem(i)} busy={explain.isPending} name={it.name} />
            </div>
          ))}
        </div>
      </div>

      {/* X-axis controls under the plane */}
      <div style={xAxisRow}>
        <AxisField value={xAxis.low} onChange={(v) => patchX({ low: v })} placeholder="low" style={{ flex: 1 }} />
        <AxisField value={xAxis.label} onChange={(v) => patchX({ label: v })} placeholder="X axis" style={{ flex: 1, fontWeight: 600, textAlign: "center" }} />
        <AxisField value={xAxis.high} onChange={(v) => patchX({ high: v })} placeholder="high" style={{ flex: 1, textAlign: "right" }} />
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
                <InfoButton onClick={() => void explainItem(i)} busy={explain.isPending} name={it.name} />
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
                void addItem();
              }
            }}
            placeholder="Add an option to compare…"
            style={addInput}
          />
          <button type="button" onClick={() => void addItem()} disabled={!newItem.trim() || score.isPending} style={addBtn}>
            + add
          </button>
          <button
            type="button"
            onClick={() => void runGenerate()}
            disabled={itemNames().length === 0 || generate.isPending}
            title="Suggest more options like these, scored and placed on the grid"
            style={addBtn}
          >
            {generate.isPending ? "✨ generating…" : "✨ generate"}
          </button>
        </div>
      </div>

      {/* Footer: settings gear (bottom-left) + send (right) */}
      <div style={{ ...footerRow, justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={toggleSettings}
          title="Settings — change the axes these options are compared on"
          style={redoBtn}
        >
          ⚙ change axes {showSettings ? "▲" : "▾"}
        </button>
        <div style={{ display: "flex", alignItems: "center" }}>
          {sent && <span style={{ marginRight: 10, fontSize: 12, color: "var(--vizithink-merged)" }}>Sent ✓</span>}
          <button type="button" onClick={send} disabled={!hasContent} style={sendBtn(hasContent)}>
            {sent ? "Send again ↩" : "Send to chat ↩"}
          </button>
        </div>
      </div>

      {/* Settings area — expands under the widget from the gear. Pick up to two
          LLM-suggested ways to compare the options (or type your own), then
          re-score every option in place on the new axes. */}
      {showSettings && (
        <div style={{ ...settingsPanel, margin: "0 10px 10px", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "var(--vizithink-text-subtle)", marginBottom: 2 }}>
            Pick up to two ways to compare these options, then re-score them.
          </div>

          {options.isPending && optionAxes.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--vizithink-text-subtle)" }}>Finding ways to compare…</div>
          ) : (
            optionAxes.map((ax, i) => {
              const checked = picks.includes(i);
              const full = !checked && picks.length >= 2;
              return (
                <label key={i} style={{ ...optionRow, opacity: full ? 0.45 : 1, cursor: full ? "not-allowed" : "pointer" }}>
                  <input type="checkbox" checked={checked} disabled={full} onChange={() => togglePick(i)} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{ax.label}</span>
                  {(ax.low || ax.high) && (
                    <span style={{ fontSize: 11, color: "var(--vizithink-text-subtle)" }}>
                      {ax.low || "low"} → {ax.high || "high"}
                    </span>
                  )}
                </label>
              );
            })
          )}

          {/* User's own axis */}
          <input
            value={customAxis}
            onChange={(e) => setCustomAxis(e.target.value)}
            placeholder="…or type your own axis"
            style={{ ...addInput, marginTop: 2 }}
          />

          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            <button
              type="button"
              onClick={() => void applyAxes()}
              disabled={(picks.length === 0 && !customAxis.trim()) || score.isPending}
              style={sendBtn(!((picks.length === 0 && !customAxis.trim()) || score.isPending))}
            >
              {score.isPending ? "Re-scoring…" : "change axes"}
            </button>
            <button type="button" onClick={() => void loadOptions()} disabled={options.isPending} style={addBtn}>
              ↻ other options
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// An editable axis label/pole field that WRAPS instead of clipping. It's a
// textarea that auto-grows to fit its (wrapped) content, so long labels like
// "Safety Level" stay fully visible in the narrow axis gutters.
function AxisField({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...poleInput, resize: "none", overflow: "hidden", lineHeight: 1.25, ...style }}
    />
  );
}

// The per-item ⓘ button. stopPropagation on pointer-down so clicking it on a
// placed chip doesn't start a drag; the click asks the server to explain the
// option and posts the result into the chat below the widget.
function InfoButton({ onClick, busy, name }: { onClick: () => void; busy: boolean; name: string }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={busy}
      title={`More about ${name} — how it ranks on these axes`}
      style={chipInfo}
    >
      ⓘ
    </button>
  );
}

const shell: CSSProperties = {
  width: "100%",
  // Cap width by the SMALLER of available width (840) and viewport height. The
  // plane is a square sized from the shell width, so an unbounded width makes the
  // widget taller than a landscape viewport (axis labels + footer scroll off).
  // Subtracting the app header + composer + chrome keeps the whole widget visible.
  maxWidth: "min(840px, calc(100dvh - 280px))",
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

const suggestBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "6px 10px",
  borderBottom: "1px solid var(--vizithink-border-soft)",
};

const yAxisCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: 4,
  width: 80,
  flexShrink: 0,
};

const plane: CSSProperties = {
  position: "relative",
  flex: 1,
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
  background: "var(--vizithink-border-soft)",
};
const crosshairH: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: 0,
  right: 0,
  height: 1,
  background: "var(--vizithink-border-soft)",
};

const chip: CSSProperties = {
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 999,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-text)",
  userSelect: "none",
  whiteSpace: "nowrap",
};

const chipX: CSSProperties = {
  fontSize: 12,
  lineHeight: 1,
  border: "none",
  background: "transparent",
  color: "var(--vizithink-text-subtle)",
  cursor: "pointer",
  padding: 0,
};

const chipInfo: CSSProperties = {
  fontSize: 11,
  lineHeight: 1,
  border: "none",
  background: "transparent",
  color: ACCENT,
  cursor: "pointer",
  padding: 0,
  opacity: 0.85,
};

const xAxisRow: CSSProperties = {
  display: "flex",
  gap: 6,
  // Left pad = plot-area left (10) + Y-axis col width (80) + flex gap (6) so the
  // X labels line up under the plane.
  padding: "6px 10px 0 96px",
};

const poleInput: CSSProperties = {
  padding: "3px 6px",
  fontSize: 11,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border-soft)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-text)",
  outline: "none",
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

const redoBtn: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 8,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
};

const settingsPanel: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  marginTop: 6,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--vizithink-border-soft)",
  background: "var(--vizithink-surface)",
};

const optionRow: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  fontSize: 12,
  color: "var(--vizithink-text)",
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

const suggestBtn = (enabled: boolean): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 8,
  border: "1px solid var(--vizithink-border)",
  background: enabled ? "var(--vizithink-accent-soft)" : "var(--vizithink-surface)",
  color: enabled ? "var(--vizithink-text)" : "var(--vizithink-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
  flexShrink: 0,
});

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
