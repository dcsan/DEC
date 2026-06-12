// Standalone Eisenhower matrix widget. Tasks start in a pool at the bottom; you
// drag each into one of the four important/urgent quadrants, then "Send" posts
// the structured entries (+ a templated plain-text rendering) back to the chat.
// Native HTML5 drag-and-drop — no library, no react-flow.

import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import { eisenhowerSpec, type EisenhowerData } from "./eisenhower.spec";

const ACCENT = "var(--vizithink-concept)";

// The four matrix cells + the unsorted pool. Each placed zone maps to the
// important/urgent flags used in the structured output.
type Zone = "pool" | "do" | "schedule" | "delegate" | "eliminate";

const ZONE_FLAGS: Record<Exclude<Zone, "pool">, { important: 0 | 1; urgent: 0 | 1 }> = {
  do: { important: 1, urgent: 1 },
  schedule: { important: 1, urgent: 0 },
  delegate: { important: 0, urgent: 1 },
  eliminate: { important: 0, urgent: 0 },
};

const QUADRANTS: { zone: Exclude<Zone, "pool">; label: string; tint: string }[] = [
  { zone: "do", label: "Do now", tint: "95, 214, 166" }, // green
  { zone: "schedule", label: "Schedule", tint: "110, 168, 254" }, // blue
  { zone: "delegate", label: "Delegate", tint: "240, 184, 110" }, // amber
  { zone: "eliminate", label: "Drop", tint: "155, 140, 255" }, // violet
];

interface Task {
  id: string;
  text: string;
  zone: Zone;
}

// Seed the pool: the router's prefilled tasks if any, else a couple of examples.
function seedTasks(items?: string[]): Task[] {
  const texts = items?.length ? items : ["Pay taxes", "Respond to Slack messages"];
  return texts.map((text) => ({ id: crypto.randomUUID(), text, zone: "pool" as const }));
}

function zoneDropSurface(active: boolean, dim: boolean, isPool: boolean, tint?: string): CSSProperties {
  // Quadrants get a faint wash of their zone colour (`tint` = "r, g, b") so the
  // four cells read at a glance; the pool stays neutral.
  const wash = tint ? `rgba(${tint}, ${active ? 0.16 : 0.07})` : undefined;
  return {
    minHeight: isPool ? undefined : 92,
    padding: 8,
    borderRadius: 8,
    border: active
      ? `2px solid ${tint ? `rgb(${tint})` : "var(--vizithink-accent)"}`
      : tint
        ? `1px solid rgba(${tint}, 0.3)`
        : "1px dashed var(--vizithink-border)",
    background: wash ?? (active ? "var(--vizithink-accent-soft)" : "var(--vizithink-surface)"),
    opacity: dim ? 0.72 : 1,
    transition: "border-color 100ms ease, background-color 100ms ease, opacity 100ms ease",
    boxShadow: active ? `inset 0 0 0 1px ${tint ? `rgb(${tint})` : "var(--vizithink-accent)"}` : undefined,
  };
}

export function EisenhowerWidget({ initial, onSend, onRemove }: WidgetProps) {
  const [title, setTitle] = useState(initial?.title || "Eisenhower Matrix");
  const [tasks, setTasks] = useState<Task[]>(() => seedTasks(initial?.items));
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<Zone | null>(null);
  const [sent, setSent] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  /** Survives dragend vs drop ordering — DataTransfer is still preferred on drop. */
  const draggingTaskIdRef = useRef<string | null>(null);

  const more = trpc.suggest.more.useMutation();
  const categorize = trpc.eisenhower.categorize.useMutation();
  const isDragging = dragId !== null;
  const dirty = () => {
    setSent(false);
    setGenError(null);
  };

  // The decision to seed the LLM with: what surfaced this widget, else the title.
  const seedQuestion = () => initial?.question?.trim() || title.trim();

  // Append more tasks from the LLM into the pool (never mid-drag — button only).
  const generateMore = async () => {
    const q = seedQuestion();
    if (!q || more.isPending) return;
    setGenError(null);
    try {
      const out = await more.mutateAsync({
        question: q,
        itemNoun: "task to prioritise",
        existing: tasks.map((t) => t.text.trim()).filter(Boolean),
      });
      if (out.items.length) {
        setTasks((cur) => [
          ...cur,
          ...out.items.map((text) => ({ id: crypto.randomUUID(), text, zone: "pool" as const })),
        ]);
        setSent(false);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Could not generate more.");
    }
  };

  // Map the two Eisenhower flags to a quadrant zone (mirrors ZONE_FLAGS).
  const zoneFor = (important: boolean, urgent: boolean): Exclude<Zone, "pool"> =>
    important && urgent ? "do" : important ? "schedule" : urgent ? "delegate" : "eliminate";

  // Auto-categorise the unsorted pool: ask the LLM to rate each task on
  // important/urgent, then move each into its quadrant. Lenient text match in
  // case the model rewords; unmatched tasks stay in the pool to drag manually.
  const runCategorize = async () => {
    const q = seedQuestion();
    const poolTexts = tasks.filter((t) => t.zone === "pool").map((t) => t.text.trim()).filter(Boolean);
    if (!q || categorize.isPending || poolTexts.length === 0) return;
    setGenError(null);
    try {
      const out = await categorize.mutateAsync({ question: q, items: poolTexts });
      const norm = (s: string) => s.trim().toLowerCase();
      const byText = new Map(out.items.map((it) => [norm(it.text), it]));
      setTasks((cur) =>
        cur.map((t) => {
          if (t.zone !== "pool") return t;
          const c = byText.get(norm(t.text));
          return c ? { ...t, zone: zoneFor(c.important, c.urgent) } : t;
        }),
      );
      setSent(false);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Could not categorise the tasks.");
    }
  };

  const clearDragState = () => {
    draggingTaskIdRef.current = null;
    setDragId(null);
    setDragOverZone(null);
  };

  const move = (id: string, zone: Zone) => {
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, zone } : t)));
    dirty();
  };

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    setTasks((cur) => [...cur, { id: crypto.randomUUID(), text, zone: "pool" }]);
    setDraft("");
    dirty();
  };

  const removeTask = (id: string) => {
    setTasks((cur) => cur.filter((t) => t.id !== id));
    dirty();
  };

  const placed = tasks.filter((t) => t.zone !== "pool");

  const send = () => {
    if (placed.length === 0) return;
    const data: EisenhowerData = {
      title,
      entries: placed.map((t) => ({
        text: t.text,
        ...ZONE_FLAGS[t.zone as Exclude<Zone, "pool">],
      })),
    };
    onSend({ type: eisenhowerSpec.type, data, text: eisenhowerSpec.format(data) });
    setSent(true);
  };

  const leaveZone = (zone: Zone) => (e: DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related as HTMLElement)) return;
    setDragOverZone((cur) => (cur === zone ? null : cur));
  };

  const dropProps = (zone: Zone) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverZone(zone);
    },
    onDragLeave: leaveZone(zone),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const id =
        e.dataTransfer.getData("text/plain") || draggingTaskIdRef.current || dragId;
      if (id) move(id, zone);
      clearDragState();
    },
  });

  const chipDragOver = (zone: Zone) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverZone(zone);
  };

  const chip = (t: Task, zone: Zone) => {
    const dragging = dragId === t.id;
    return (
      <div
        key={t.id}
        draggable
        onDragOver={chipDragOver(zone)}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", t.id);
          e.dataTransfer.effectAllowed = "move";
          draggingTaskIdRef.current = t.id;
          setDragId(t.id);
        }}
        onDragEnd={clearDragState}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 7px",
          marginBottom: 4,
          fontSize: 12,
          borderRadius: 6,
          border: "1px solid var(--vizithink-border)",
          background: dragging ? "var(--vizithink-surface-2)" : "var(--vizithink-surface)",
          color: "var(--vizithink-text)",
          cursor: "grab",
          opacity: dragging ? 0.45 : 1,
          userSelect: "none",
        }}
      >
        <span
          title="Drag to move"
          style={{
            fontSize: 12,
            lineHeight: 1,
            color: "var(--vizithink-text-muted)",
            cursor: "grab",
            flexShrink: 0,
          }}
        >
          ⠿
        </span>
        <span style={{ flex: 1 }}>{t.text}</span>
        <button
          type="button"
          title="Remove task"
          draggable={false}
          onClick={(ev) => {
            ev.stopPropagation();
            removeTask(t.id);
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--vizithink-text-subtle)",
            cursor: "pointer",
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          ⨯
        </button>
      </div>
    );
  };

  const pool = tasks.filter((t) => t.zone === "pool");

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 840,
        borderRadius: 12,
        background: "var(--vizithink-surface-2)",
        border: `1.5px solid ${ACCENT}`,
        boxShadow: "0 1px 2px #0006",
        color: "var(--vizithink-text)",
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
          borderBottom: "1px solid var(--vizithink-border-soft)",
          background: "var(--vizithink-surface)",
        }}
      >
        <span style={{ fontSize: 13 }}>▥</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            dirty();
          }}
          placeholder="Title"
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            background: "transparent",
            color: "var(--vizithink-text)",
            outline: "none",
          }}
        />
        <button type="button" title="Remove widget" onClick={onRemove} style={iconBtn}>
          ⨯
        </button>
      </div>

      {/* Hint: keep copy in the label — do not mount new rows mid-drag (breaks HTML5 DnD). */}
      {/* Matrix */}
      <div style={{ padding: "8px 10px" }}>
        <div style={{ display: "flex", paddingLeft: 56, fontSize: 11, color: "var(--vizithink-text-subtle)" }}>
          <span style={{ flex: 1, textAlign: "center" }}>Urgent</span>
          <span style={{ flex: 1, textAlign: "center" }}>Not urgent</span>
        </div>

        <div style={{ display: "flex" }}>
          <div
            style={{
              width: 56,
              display: "flex",
              flexDirection: "column",
              fontSize: 11,
              color: "var(--vizithink-text-subtle)",
            }}
          >
            <span
              style={{
                flex: 1,
                display: "grid",
                placeItems: "center",
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              Important
            </span>
            <span
              style={{
                flex: 1,
                display: "grid",
                placeItems: "center",
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              Not important
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            {QUADRANTS.map((q) => {
              const inZone = tasks.filter((t) => t.zone === q.zone);
              const active = dragOverZone === q.zone;
              const dim = isDragging && dragOverZone !== null && dragOverZone !== q.zone;
              return (
                <div
                  key={q.zone}
                  {...dropProps(q.zone)}
                  style={zoneDropSurface(active, dim, false, q.tint)}
                >
                  <div
                    onDragOver={chipDragOver(q.zone)}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: `rgb(${q.tint})`,
                      marginBottom: 4,
                    }}
                  >
                    {q.label}
                  </div>
                  {inZone.length === 0 && (
                    <div
                      onDragOver={chipDragOver(q.zone)}
                      style={{
                        fontSize: 11,
                        color: active ? "var(--vizithink-text)" : "var(--vizithink-text-muted)",
                        padding: "10px 6px",
                        textAlign: "center",
                        borderRadius: 6,
                        border: isDragging ? "1px dashed var(--vizithink-accent)" : "1px dashed var(--vizithink-border-soft)",
                        background: active ? "var(--vizithink-surface-2)" : "transparent",
                      }}
                    >
                      {isDragging ? "Release to drop here" : "Empty — drag a task here"}
                    </div>
                  )}
                  {inZone.map((t) => chip(t, q.zone))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pool */}
      <div
        {...dropProps("pool")}
        style={{
          margin: "0 10px 8px",
          ...zoneDropSurface(dragOverZone === "pool", isDragging && dragOverZone !== null && dragOverZone !== "pool", true),
        }}
      >
        <div
          onDragOver={chipDragOver("pool")}
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--vizithink-text-subtle)",
            marginBottom: 4,
          }}
        >
          Task pool — drag into the matrix above
        </div>
        {pool.length === 0 && (
          <div
            onDragOver={chipDragOver("pool")}
            style={{
              fontSize: 11,
              color: dragOverZone === "pool" ? "var(--vizithink-text)" : "var(--vizithink-text-muted)",
              padding: "8px 4px",
              textAlign: "center",
              borderRadius: 6,
              border: isDragging ? "1px dashed var(--vizithink-accent)" : "1px dashed var(--vizithink-border-soft)",
              marginBottom: 6,
            }}
          >
            {isDragging ? "Release to return tasks to the pool" : "(all tasks sorted into the matrix)"}
          </div>
        )}
        {pool.map((t) => chip(t, "pool"))}

        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTask();
              }
            }}
            placeholder="Add a task…"
            style={{
              flex: 1,
              padding: "5px 7px",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid var(--vizithink-border)",
              background: "var(--vizithink-surface-2)",
              color: "var(--vizithink-text)",
              outline: "none",
            }}
          />
          <button type="button" onClick={addTask} style={addBtn}>
            + add
          </button>
          <button
            type="button"
            onClick={generateMore}
            disabled={!seedQuestion() || more.isPending}
            style={genBtn(!!seedQuestion() && !more.isPending)}
          >
            {more.isPending ? "Thinking…" : "✨ generate more"}
          </button>
          <button
            type="button"
            onClick={runCategorize}
            disabled={!seedQuestion() || pool.length === 0 || categorize.isPending}
            title="Sort the pooled tasks into the matrix automatically"
            style={genBtn(!!seedQuestion() && pool.length > 0 && !categorize.isPending)}
          >
            {categorize.isPending ? "Sorting…" : "⚡ categorize"}
          </button>
        </div>
        {genError && (
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--vizithink-option)" }}>{genError}</div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "8px 10px",
          borderTop: "1px solid var(--vizithink-border-soft)",
          background: "var(--vizithink-surface)",
        }}
      >
        {sent && (
          <span style={{ marginRight: 10, fontSize: 12, color: "var(--vizithink-merged)" }}>Sent ✓</span>
        )}
        <button type="button" onClick={send} disabled={placed.length === 0} style={sendBtn(placed.length > 0)}>
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
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "#ff8b8b",
  cursor: "pointer",
  flexShrink: 0,
};

const addBtn: CSSProperties = {
  fontSize: 11,
  padding: "3px 10px",
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
};

const genBtn = (enabled: boolean): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: enabled ? "var(--vizithink-accent-soft)" : "var(--vizithink-surface)",
  color: enabled ? "var(--vizithink-text)" : "var(--vizithink-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
  whiteSpace: "nowrap",
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
