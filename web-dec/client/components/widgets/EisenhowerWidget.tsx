// Standalone Eisenhower matrix widget. Tasks start in a pool at the bottom; you
// drag each into one of the four important/urgent quadrants, then "Send" posts
// the structured entries (+ a templated plain-text rendering) back to the chat.
// Native HTML5 drag-and-drop — no library, no react-flow.

import { useState } from "react";
import type { WidgetProps } from "./types";
import { eisenhowerSpec, type EisenhowerData } from "./eisenhower.spec";

const ACCENT = "var(--dec-concept)";

// The four matrix cells + the unsorted pool. Each placed zone maps to the
// important/urgent flags used in the structured output.
type Zone = "pool" | "do" | "schedule" | "delegate" | "eliminate";

const ZONE_FLAGS: Record<Exclude<Zone, "pool">, { important: 0 | 1; urgent: 0 | 1 }> = {
  do: { important: 1, urgent: 1 },
  schedule: { important: 1, urgent: 0 },
  delegate: { important: 0, urgent: 1 },
  eliminate: { important: 0, urgent: 0 },
};

const QUADRANTS: { zone: Exclude<Zone, "pool">; label: string }[] = [
  { zone: "do", label: "Do now" },
  { zone: "schedule", label: "Schedule" },
  { zone: "delegate", label: "Delegate" },
  { zone: "eliminate", label: "Drop" },
];

interface Task {
  id: string;
  text: string;
  zone: Zone;
}

// Seed a couple of example tasks in the pool so there's something to drag.
function seedTasks(): Task[] {
  return [
    { id: crypto.randomUUID(), text: "Pay taxes", zone: "pool" },
    { id: crypto.randomUUID(), text: "Respond to Slack messages", zone: "pool" },
  ];
}

export function EisenhowerWidget({ onSend, onRemove }: WidgetProps) {
  const [title, setTitle] = useState("Eisenhower Matrix");
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const dirty = () => setSent(false);

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

  // Drop handler factory for a zone.
  const dropProps = (zone: Zone) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain") || dragId;
      if (id) move(id, zone);
      setDragId(null);
    },
  });

  const chip = (t: Task) => (
    <div
      key={t.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", t.id);
        e.dataTransfer.effectAllowed = "move";
        setDragId(t.id);
      }}
      onDragEnd={() => setDragId(null)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 7px",
        marginBottom: 4,
        fontSize: 12,
        borderRadius: 6,
        border: "1px solid var(--dec-border)",
        background: "var(--dec-surface)",
        color: "var(--dec-text)",
        cursor: "grab",
        opacity: dragId === t.id ? 0.4 : 1,
      }}
    >
      <span style={{ flex: 1 }}>{t.text}</span>
      <button
        type="button"
        title="Remove task"
        onClick={() => removeTask(t.id)}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--dec-text-subtle)",
          cursor: "pointer",
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        ⨯
      </button>
    </div>
  );

  const pool = tasks.filter((t) => t.zone === "pool");

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
            color: "var(--dec-text)",
            outline: "none",
          }}
        />
        <button type="button" title="Remove widget" onClick={onRemove} style={iconBtn}>
          ⨯
        </button>
      </div>

      {/* Matrix */}
      <div style={{ padding: "8px 10px" }}>
        {/* Column axis labels */}
        <div style={{ display: "flex", paddingLeft: 56, fontSize: 11, color: "var(--dec-text-subtle)" }}>
          <span style={{ flex: 1, textAlign: "center" }}>Urgent</span>
          <span style={{ flex: 1, textAlign: "center" }}>Not urgent</span>
        </div>

        <div style={{ display: "flex" }}>
          {/* Row axis labels */}
          <div
            style={{
              width: 56,
              display: "flex",
              flexDirection: "column",
              fontSize: 11,
              color: "var(--dec-text-subtle)",
            }}
          >
            <span style={{ flex: 1, display: "grid", placeItems: "center", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              Important
            </span>
            <span style={{ flex: 1, display: "grid", placeItems: "center", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              Not important
            </span>
          </div>

          {/* 2×2 grid */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            {QUADRANTS.map((q) => (
              <div
                key={q.zone}
                {...dropProps(q.zone)}
                style={{
                  minHeight: 84,
                  padding: 6,
                  borderRadius: 8,
                  border: `1px dashed var(--dec-border)`,
                  background: "var(--dec-surface)",
                }}
              >
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--dec-text-subtle)", marginBottom: 4 }}>
                  {q.label}
                </div>
                {tasks.filter((t) => t.zone === q.zone).map(chip)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pool (drag tasks from here) */}
      <div
        {...dropProps("pool")}
        style={{
          margin: "0 10px 8px",
          padding: 8,
          borderRadius: 8,
          border: "1px dashed var(--dec-border)",
          background: "var(--dec-surface)",
        }}
      >
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--dec-text-subtle)", marginBottom: 4 }}>
          Tasks — drag into the matrix
        </div>
        {pool.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--dec-text-subtle)", padding: "2px 0 4px" }}>
            (all sorted)
          </div>
        )}
        {pool.map(chip)}

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
              border: "1px solid var(--dec-border)",
              background: "var(--dec-surface-2)",
              color: "var(--dec-text)",
              outline: "none",
            }}
          />
          <button type="button" onClick={addTask} style={addBtn}>
            + add
          </button>
        </div>
      </div>

      {/* Footer */}
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
        <button type="button" onClick={send} disabled={placed.length === 0} style={sendBtn(placed.length > 0)}>
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

const addBtn: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 10px",
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface-2)",
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
