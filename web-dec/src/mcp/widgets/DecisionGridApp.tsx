// The ViziThink "decision grid" widget — a REAL React component rendered inside
// ChatGPT via MCP Apps.
//
// How it reaches ChatGPT: this file is bundled (React included) into a single
// self-contained HTML string by scripts/build-widgets.mjs → decisionGrid.generated.ts,
// which the Worker serves as the MCP UI resource (see src/mcp/server.ts). There
// is no filesystem at runtime and no network: React is inlined, so the
// resource's CSP allowlists stay empty.
//
// How it gets its data: ChatGPT injects `window.openai` into the widget iframe
// (the OpenAI Apps SDK host contract). `window.openai.toolOutput` is the
// `structuredContent` the `plot_decision` tool returned (a DecisionGridData),
// and `openai:set_globals` fires whenever the host swaps it. We read defensively
// so the widget degrades to a friendly empty state in any other host.
//
// (The server side uses @modelcontextprotocol/ext-apps' registerAppTool/
// registerAppResource helpers; that SDK's `useApp` postMessage bridge targets
// MCP-native hosts like Claude Desktop, not ChatGPT, so here we bind to the
// ChatGPT host global directly.)

import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type DecisionGridData,
  type PlacedItem,
  formatDecisionGrid,
} from "./decisionGrid.shared";

// ---- ChatGPT (OpenAI Apps SDK) host global — minimal local typing ----------
interface OpenAiHost {
  toolOutput?: unknown;
  theme?: "light" | "dark";
  sendFollowUpMessage?: (args: { prompt: string }) => void | Promise<unknown>;
  setWidgetState?: (state: unknown) => void | Promise<unknown>;
}
declare global {
  interface Window {
    openai?: OpenAiHost;
  }
}

function readData(): DecisionGridData | null {
  try {
    const out = window.openai?.toolOutput as DecisionGridData | undefined;
    if (out && Array.isArray(out.items) && out.xAxis && out.yAxis) return out;
  } catch {
    /* ignore */
  }
  return null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function DecisionGrid() {
  const [data, setData] = useState<DecisionGridData | null>(readData);
  const [items, setItems] = useState<PlacedItem[]>(() => readData()?.items ?? []);
  const [sent, setSent] = useState(false);
  const planeRef = useRef<HTMLDivElement>(null);
  const dragName = useRef<string | null>(null);

  // Re-read when the host swaps globals (tool re-runs / theme change).
  useEffect(() => {
    const onGlobals = () => {
      const next = readData();
      setData(next);
      if (next) setItems(next.items);
    };
    window.addEventListener("openai:set_globals", onGlobals);
    return () => window.removeEventListener("openai:set_globals", onGlobals);
  }, []);

  const moveTo = useCallback((name: string, clientX: number, clientY: number) => {
    const el = planeRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = clamp(((clientX - r.left) / r.width) * 100);
    // Screen Y is inverted: top of the plane is the HIGH end of the axis.
    const y = clamp(100 - ((clientY - r.top) / r.height) * 100);
    setItems((prev) => prev.map((it) => (it.name === name ? { ...it, x, y } : it)));
    setSent(false);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragName.current) return;
      moveTo(dragName.current, e.clientX, e.clientY);
    },
    [moveTo],
  );

  const endDrag = useCallback(() => {
    dragName.current = null;
  }, []);

  const sendToChat = useCallback(() => {
    if (!data) return;
    const text = formatDecisionGrid({ ...data, items });
    window.openai?.sendFollowUpMessage?.({ prompt: text });
    window.openai?.setWidgetState?.({ items });
    setSent(true);
  }, [data, items]);

  if (!data) {
    return (
      <div className="empty">No decision to plot yet.</div>
    );
  }

  const placed = items.filter((it) => it.x != null && it.y != null);
  const tray = items.filter((it) => it.x == null || it.y == null);

  return (
    <div className="wrap">
      <header className="head">
        <h1>{data.title || "2×2 decision"}</h1>
        {data.question && <p className="q">{data.question}</p>}
      </header>

      <div className="board">
        <div className="yhi">{data.yAxis.high || "high"}</div>
        <div className="ylabel">{data.yAxis.label || "Y"}</div>
        <div className="ylo">{data.yAxis.low || "low"}</div>
        <div
          className="plane"
          ref={planeRef}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <div className="axisV" />
          <div className="axisH" />
          {placed.map((it) => (
            <button
              key={it.name}
              type="button"
              className="chip placed"
              style={{ left: `${it.x}%`, bottom: `${it.y}%` }}
              onPointerDown={(e) => {
                dragName.current = it.name;
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                setSent(false);
              }}
              title="Drag to reposition"
            >
              {it.name}
            </button>
          ))}
        </div>
        <div className="xrow">
          <span className="xlo">{data.xAxis.low || "low"}</span>
          <span className="xlabel">{data.xAxis.label || "X"}</span>
          <span className="xhi">{data.xAxis.high || "high"}</span>
        </div>
      </div>

      {tray.length > 0 && (
        <div className="tray">
          <span className="trayLabel">Tap to place:</span>
          {tray.map((it) => (
            <button
              key={it.name}
              type="button"
              className="chip"
              onClick={() => place(it.name)}
            >
              {it.name}
            </button>
          ))}
        </div>
      )}

      <footer className="foot">
        <button type="button" className="send" onClick={sendToChat}>
          {sent ? "Sent ✓" : "Send placements to chat"}
        </button>
      </footer>
    </div>
  );

  // Place an unplaced item at the centre of the plane.
  function place(name: string) {
    setItems((prev) =>
      prev.map((it) => (it.name === name ? { ...it, x: 50, y: 50 } : it)),
    );
    setSent(false);
  }
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<DecisionGrid />);
