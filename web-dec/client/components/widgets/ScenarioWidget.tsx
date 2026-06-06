// Scenario planning widget — see scenario.spec.ts.
//
// A branching tree of futures: the decision fans out into top-level futures,
// each of which can branch again (a → b → c) into follow-on events. Every node
// has a likelihood and a good / bad / neutral outcome. No prose field — the
// shape of the tree and its outcomes carry the meaning.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import {
  blankScenarioData,
  hasNamedBranch,
  makeNode,
  parseChance,
  scenarioSpec,
  type Outcome,
  type ScenarioNode,
} from "./scenario.spec";
import type { ScenarioNodeSuggestion } from "../../../src/trpc/routers/scenario";

const ACCENT = "var(--dec-option)";
const GOOD = "var(--dec-merged)";
const BAD = "#ff8b8b";
const NEUTRAL = "var(--dec-text-subtle)";
const outcomeColor = (o: Outcome) => (o === "good" ? GOOD : o === "bad" ? BAD : NEUTRAL);

// --- immutable tree helpers (operate on a node id, recurse into children) ----
function mapTree(nodes: ScenarioNode[], id: string, fn: (n: ScenarioNode) => ScenarioNode): ScenarioNode[] {
  return nodes.map((n) =>
    n.id === id ? fn(n) : { ...n, children: mapTree(n.children, id, fn) },
  );
}
function removeFromTree(nodes: ScenarioNode[], id: string): ScenarioNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeFromTree(n.children, id) }));
}
function ingest(s: ScenarioNodeSuggestion): ScenarioNode {
  return makeNode({
    name: s.name,
    chance: s.chance,
    outcome: s.outcome,
    children: s.children.map(ingest),
  });
}

export function ScenarioWidget({ initial, onSend, onRemove }: WidgetProps) {
  const blank = blankScenarioData(initial?.title || "");
  const [title, setTitle] = useState(blank.title);
  const [tree, setTree] = useState<ScenarioNode[]>(blank.tree);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const more = trpc.suggest.more.useMutation();
  const suggest = trpc.scenario.suggest.useMutation();

  const edit = (next: ScenarioNode[]) => {
    setTree(next);
    setSent(false);
    setError(null);
  };

  const patch = (id: string, p: Partial<ScenarioNode>) =>
    edit(mapTree(tree, id, (n) => ({ ...n, ...p })));
  const addChild = (id: string) =>
    edit(mapTree(tree, id, (n) => ({ ...n, children: [...n.children, makeNode()] })));
  const addTop = () => edit([...tree, makeNode()]);
  const remove = (id: string) => edit(removeFromTree(tree, id));

  // The decision to seed the LLM with: what surfaced this widget, else the title.
  const seedQuestion = () => initial?.question?.trim() || title.trim();

  // Append more top-level futures from the LLM as fresh branches.
  const generateMore = async () => {
    const q = seedQuestion();
    if (!q || more.isPending) return;
    setError(null);
    try {
      const out = await more.mutateAsync({
        question: q,
        itemNoun: "plausible future scenario",
        existing: tree.map((n) => n.name.trim()).filter(Boolean),
      });
      if (out.items.length) {
        setTree((cur) => [...cur, ...out.items.map((name) => makeNode({ name }))]);
        setSent(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate more.");
    }
  };

  // Draft a fresh branching tree of futures and replace the blank seed rows.
  const runSuggest = async () => {
    const q = seedQuestion();
    if (!q || suggest.isPending) return;
    setError(null);
    try {
      const out = await suggest.mutateAsync({ question: q });
      if (out.scenarios.length) {
        setTree(out.scenarios.map(ingest));
        setSent(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate scenarios.");
    }
  };

  // Surfaced with a decision already → draft the futures once on mount.
  const autofilled = useRef(false);
  useEffect(() => {
    if (autofilled.current) return;
    autofilled.current = true;
    if (initial?.question?.trim() || initial?.title?.trim()) void runSuggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasContent = hasNamedBranch(tree);

  const send = () => {
    if (!hasContent) return;
    const data = { title, tree };
    onSend({ type: scenarioSpec.type, data, text: scenarioSpec.format(data) });
    setSent(true);
  };

  return (
    <div style={shell(ACCENT)}>
      <HeaderRow emoji="🔭" title={title} setTitle={setTitle} setSent={setSent} onRemove={onRemove} />
      <div style={{ padding: "8px 10px 8px" }}>
        {tree.map((n) => (
          <NodeEditor
            key={n.id}
            node={n}
            depth={0}
            patch={patch}
            addChild={addChild}
            remove={remove}
          />
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <button type="button" onClick={addTop} style={addBtn}>
            + future
          </button>
          <button
            type="button"
            onClick={generateMore}
            disabled={!seedQuestion() || more.isPending}
            style={genBtn(!!seedQuestion() && !more.isPending)}
          >
            {more.isPending ? "Thinking…" : "✨ generate more"}
          </button>
          {suggest.isPending && (
            <span style={{ fontSize: 11, color: "var(--dec-text-subtle)" }}>drafting tree…</span>
          )}
          {error && <span style={{ fontSize: 11, color: BAD }}>{error}</span>}
        </div>

        <ScenarioTree tree={tree} />
      </div>
      <FooterRow sent={sent} hasContent={hasContent} send={send} />
    </div>
  );
}

// --- recursive editor row ----------------------------------------------------
function NodeEditor(props: {
  node: ScenarioNode;
  depth: number;
  patch: (id: string, p: Partial<ScenarioNode>) => void;
  addChild: (id: string) => void;
  remove: (id: string) => void;
}) {
  const { node, depth, patch, addChild, remove } = props;
  return (
    <div
      style={{
        marginBottom: 6,
        marginLeft: depth ? 14 : 0,
        paddingLeft: depth ? 10 : 0,
        borderLeft: depth ? `2px solid ${outcomeColor(node.outcome)}55` : "none",
      }}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          value={node.name}
          placeholder={depth === 0 ? "Future…" : "Then…"}
          onChange={(e) => patch(node.id, { name: e.target.value })}
          style={{ ...inp, flex: 1 }}
        />
        <div style={{ position: "relative", width: 64, flexShrink: 0 }}>
          <input
            value={node.chance}
            placeholder="%"
            inputMode="decimal"
            title="Likelihood relative to its siblings (e.g. 30 or 30%)"
            onChange={(e) => patch(node.id, { chance: e.target.value })}
            style={{ ...inp, paddingRight: 14, textAlign: "right" }}
          />
          <span style={pctSuffix}>%</span>
        </div>
        <OutcomeToggle
          value={node.outcome}
          onChange={(o) => patch(node.id, { outcome: o })}
        />
        <button type="button" title="Add a follow-on event" onClick={() => addChild(node.id)} style={branchBtn}>
          ↳
        </button>
        <button type="button" title="Remove this branch" onClick={() => remove(node.id)} style={removeBtn}>
          ⨯
        </button>
      </div>
      {node.children.map((c) => (
        <NodeEditor key={c.id} node={c} depth={depth + 1} patch={patch} addChild={addChild} remove={remove} />
      ))}
    </div>
  );
}

// Good / bad toggle. Clicking the active state again clears it back to neutral.
function OutcomeToggle({ value, onChange }: { value: Outcome; onChange: (o: Outcome) => void }) {
  const pill = (target: "good" | "bad", glyph: string, color: string): CSSProperties => {
    const active = value === target;
    return {
      width: 22,
      height: 24,
      fontSize: 12,
      borderRadius: 6,
      border: `1px solid ${active ? color : "var(--dec-border)"}`,
      background: active ? `${color}33` : "transparent",
      color: active ? color : "var(--dec-text-subtle)",
      cursor: "pointer",
      padding: 0,
    };
  };
  return (
    <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
      <button
        type="button"
        title="Good outcome"
        onClick={() => onChange(value === "good" ? "neutral" : "good")}
        style={pill("good", "✓", GOOD)}
      >
        ✓
      </button>
      <button
        type="button"
        title="Bad outcome"
        onClick={() => onChange(value === "bad" ? "neutral" : "bad")}
        style={pill("bad", "✗", BAD)}
      >
        ✗
      </button>
    </div>
  );
}

// --- branching tree graph (pure SVG, left-to-right) --------------------------
interface Laid {
  id: string;
  label: string;
  outcome: Outcome;
  chance: string;
  x: number;
  y: number;
}
interface Link {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  outcome: Outcome;
}

const isShown = (n: ScenarioNode): boolean =>
  n.name.trim() !== "" || n.children.some(isShown);

function ScenarioTree({ tree }: { tree: ScenarioNode[] }) {
  const shownTop = tree.filter(isShown);
  if (shownTop.length === 0) return null;

  const rowH = 30;
  const levelGap = 132;
  const padY = 8;
  const rootX = 10;
  const firstX = 92;
  const nodes: Laid[] = [];
  const links: Link[] = [];
  const leaf = { v: 0 };

  // Place each shown node: x by depth, y centred on its shown children (or the
  // next free leaf row). Returns the y of each placed node so a parent can
  // centre itself and draw links down to them.
  const place = (siblings: ScenarioNode[], depth: number): { id: string; x: number; y: number; outcome: Outcome }[] =>
    siblings.filter(isShown).map((n) => {
      const x = firstX + depth * levelGap;
      const kids = place(n.children, depth + 1);
      const y = kids.length
        ? (kids[0].y + kids[kids.length - 1].y) / 2
        : padY + leaf.v++ * rowH + rowH / 2;
      nodes.push({
        id: n.id,
        label: n.name.trim() || "Branch",
        outcome: n.outcome,
        chance: n.chance,
        x,
        y,
      });
      kids.forEach((k) => links.push({ x1: x, y1: y, x2: k.x, y2: k.y, outcome: k.outcome }));
      return { id: n.id, x, y, outcome: n.outcome };
    });

  const tops = place(tree, 0);
  const leafCount = Math.max(1, leaf.v);
  const H = padY * 2 + leafCount * rowH;
  const rootY = tops.length ? (tops[0].y + tops[tops.length - 1].y) / 2 : H / 2;
  tops.forEach((t) => links.push({ x1: rootX + 10, y1: rootY, x2: t.x, y2: t.y, outcome: t.outcome }));

  const maxDepth = nodes.reduce((d, n) => Math.max(d, Math.round((n.x - firstX) / levelGap)), 0);
  const W = firstX + maxDepth * levelGap + 150;

  const curve = (l: Link) => {
    const mx = (l.x1 + l.x2) / 2;
    return `M ${l.x1} ${l.y1} C ${mx} ${l.y1}, ${mx} ${l.y2}, ${l.x2} ${l.y2}`;
  };

  return (
    <div style={{ marginTop: 12, overflowX: "auto" }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--dec-text-subtle)" }}>
        Scenario tree
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", maxWidth: "none" }}>
        {/* decision root */}
        <rect x={rootX} y={rootY - 9} width={10} height={18} rx={3} fill="var(--dec-text-subtle)" opacity={0.6} />
        {links.map((l, i) => (
          <path key={i} d={curve(l)} fill="none" stroke={outcomeColor(l.outcome)} strokeWidth={2} opacity={0.5} />
        ))}
        {nodes.map((n) => {
          const color = outcomeColor(n.outcome);
          const pct = parseChance(n.chance);
          const label = truncate(n.label, 18) + (pct != null ? ` · ${Math.round(pct)}%` : "");
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={4} fill={color} />
              <text x={n.x + 8} y={n.y} dominantBaseline="middle" fontSize={11} fill="var(--dec-text)">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

const pctSuffix: CSSProperties = {
  position: "absolute",
  right: 5,
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 11,
  color: "var(--dec-text-subtle)",
  pointerEvents: "none",
};

function shell(accent: string): CSSProperties {
  return {
    width: "100%",
    maxWidth: 460,
    borderRadius: 12,
    background: "var(--dec-surface-2)",
    border: `1.5px solid ${accent}`,
    boxShadow: "0 1px 2px #0006",
    color: "var(--dec-text)",
    overflow: "hidden",
  };
}

function HeaderRow(props: {
  emoji: string;
  title: string;
  setTitle: (t: string) => void;
  setSent: (v: boolean) => void;
  onRemove: () => void;
}) {
  const { emoji, title, setTitle, setSent, onRemove } = props;
  return (
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
      <span style={{ fontSize: 13 }}>{emoji}</span>
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
  );
}

function FooterRow(props: { sent: boolean; hasContent: boolean; send: () => void }) {
  const { sent, hasContent, send } = props;
  return (
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
  );
}

const inp: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
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
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px dashed var(--dec-border)",
  background: "transparent",
  color: "var(--dec-text-muted)",
  cursor: "pointer",
};

const branchBtn: CSSProperties = {
  fontSize: 13,
  width: 24,
  height: 24,
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  color: "var(--dec-text-muted)",
  cursor: "pointer",
  flexShrink: 0,
  padding: 0,
};

const removeBtn: CSSProperties = {
  fontSize: 12,
  width: 24,
  height: 24,
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  color: BAD,
  cursor: "pointer",
  flexShrink: 0,
  padding: 0,
};

const genBtn = (enabled: boolean): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: enabled ? "var(--dec-accent-soft)" : "var(--dec-surface)",
  color: enabled ? "var(--dec-text)" : "var(--dec-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
  whiteSpace: "nowrap",
});

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
