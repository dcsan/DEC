// Scenario planning widget — see scenario.spec.ts.
//
// A branching tree of futures: the decision fans out into top-level futures,
// each of which can branch again (a → b → c) into follow-on events. Every node
// has a likelihood and a good / bad / neutral outcome. No prose field — the
// shape of the tree and its outcomes carry the meaning.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { sankey, sankeyJustify, sankeyLinkHorizontal, type SankeyNode } from "d3-sankey";
import { Trash2 } from "lucide-react";
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

const ACCENT = "var(--vizithink-option)";
const GOOD = "var(--vizithink-merged)";
const BAD = "#ff8b8b";
const NEUTRAL = "var(--vizithink-text-subtle)";
const outcomeColor = (o: Outcome) => (o === "good" ? GOOD : o === "bad" ? BAD : NEUTRAL);
// Hex equivalents (not CSS vars) so we can append an alpha for the subtle left
// row line — `${cssVar}55` is invalid CSS, which is why only the (hex) red
// showed before. green / grey / red, matching the outcome.
const OUTCOME_LINE: Record<Outcome, string> = { good: "#5fd6a6", neutral: "#6b7280", bad: "#ff8b8b" };

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

export function ScenarioWidget({ initial, onSend, onRemove, onCommand }: WidgetProps) {
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

  // Clicking a Sankey node sends the whole root→node path to the chat and asks
  // how likely that path really is and how to make it more likely.
  const askPath = (id: string) => {
    if (!onCommand) return;
    const path: ScenarioNode[] = [];
    const find = (nodes: ScenarioNode[], trail: ScenarioNode[]): boolean => {
      for (const n of nodes) {
        const next = [...trail, n];
        if (n.id === id) {
          path.push(...next);
          return true;
        }
        if (find(n.children, next)) return true;
      }
      return false;
    };
    find(tree, []);
    if (path.length === 0) return;

    // Absolute path likelihood — the same sibling normalisation the Sankey uses
    // (chances are conditional on the parent; missing chance counts as 1).
    let abs = 1;
    let siblings = tree;
    for (const node of path) {
      const shown = siblings.filter(isShown);
      const weights = shown.map((n) => Math.max(0.001, parseChance(n.chance) ?? 1));
      const total = weights.reduce((a, b) => a + b, 0);
      const i = shown.findIndex((n) => n.id === node.id);
      if (i >= 0 && total > 0) abs *= weights[i]! / total;
      siblings = node.children;
    }
    const pct = abs * 100;
    const pctText = pct < 1 ? "under 1" : `about ${Math.round(pct)}`;

    const step = (n: ScenarioNode) => {
      const name = n.name.trim() || "Branch";
      const c = parseChance(n.chance);
      return c != null ? `${name} (${Math.round(c)}%)` : name;
    };
    const pathText = [seedQuestion() || title.trim() || "My decision", ...path.map(step)].join(" → ");

    const goal =
      path[path.length - 1]!.outcome === "bad"
        ? "reduce the chance of this path happening, or soften its impact if it does"
        : "increase the chance of this path happening";
    onCommand(
      `Looking at this path in my scenario tree:\n\n${pathText}\n\nThe chances above multiply out to ${pctText}% overall. How realistic is that likelihood, and what concrete things can I do to ${goal}?`,
    );
  };

  return (
    <div style={shell(ACCENT)}>
      <HeaderRow
        emoji="🔭"
        title={title}
        setTitle={setTitle}
        setSent={setSent}
        onRemove={onRemove}
        onHelp={onCommand ? () => onCommand("/help sc") : undefined}
      />
      <div style={{ padding: "8px 10px 8px" }}>
        {/* Column headers — widths mirror the NodeEditor row below. */}
        <div style={colHeaderRow}>
          <span style={{ flex: 1 }}>Scenario</span>
          <span style={{ width: 64, textAlign: "right" }}>Likelihood</span>
          <span style={{ width: 84, textAlign: "center" }}>Outcome</span>
          <span style={{ width: 24 }} />
          <span style={{ width: 24 }} />
        </div>
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
            <span style={{ fontSize: 11, color: "var(--vizithink-text-subtle)" }}>drafting tree…</span>
          )}
          {error && <span style={{ fontSize: 11, color: BAD }}>{error}</span>}
        </div>

        <ScenarioSankey tree={tree} title={title} onAsk={onCommand ? askPath : undefined} />
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
        borderLeft: depth ? `2px solid ${OUTCOME_LINE[node.outcome]}66` : "none",
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
        <button type="button" title="Delete this branch" onClick={() => remove(node.id)} style={removeBtn}>
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
      {node.children.map((c) => (
        <NodeEditor key={c.id} node={c} depth={depth + 1} patch={patch} addChild={addChild} remove={remove} />
      ))}
    </div>
  );
}

// Outcome cycle order + display. One button you keep clicking to advance:
// bad → ok → good → bad… each with an emoji, a word, and a colour.
const OUTCOME_CYCLE: Outcome[] = ["bad", "neutral", "good"];
const OUTCOME_META: Record<Outcome, { emoji: string; label: string; color: string; tint: string }> = {
  good: { emoji: "🙂", label: "Good", color: GOOD, tint: "#5fd6a622" },
  neutral: { emoji: "😐", label: "OK", color: NEUTRAL, tint: "#6b728022" },
  bad: { emoji: "🙁", label: "Bad", color: BAD, tint: "#ff8b8b22" },
};

// Single outcome toggle: click to cycle bad → ok → good.
function OutcomeToggle({ value, onChange }: { value: Outcome; onChange: (o: Outcome) => void }) {
  const meta = OUTCOME_META[value];
  const cycle = () => onChange(OUTCOME_CYCLE[(OUTCOME_CYCLE.indexOf(value) + 1) % OUTCOME_CYCLE.length]!);
  return (
    <button
      type="button"
      title="Outcome — click to cycle bad / ok / good"
      onClick={cycle}
      style={{
        width: 84,
        height: 24,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 6,
        border: `1px solid ${meta.color}`,
        background: meta.tint,
        color: meta.color,
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span style={{ fontSize: 13 }}>{meta.emoji}</span>
      {meta.label}
    </button>
  );
}

// --- Sankey flow diagram -----------------------------------------------------
// We use d3-sankey only for the layout maths, then render the SVG ourselves so
// links/nodes use the theme outcome colours. The decision is the single source
// node; each branch is a flow whose thickness is its likelihood. The wrapper
// scrolls horizontally when the diagram is wider than the page.
const isShown = (n: ScenarioNode): boolean =>
  n.name.trim() !== "" || n.children.some(isShown);

type SankeyDatum = { id: string; name: string; outcome: Outcome; chance: number | null };
type SankeyFlow = { source: string; target: string; value: number };

type SNode = SankeyNode<SankeyDatum, SankeyFlow>;

function ScenarioSankey({
  tree,
  title,
  onAsk,
}: {
  tree: ScenarioNode[];
  title: string;
  onAsk?: (id: string) => void;
}) {
  // Hooks first (before any early return) so hook order stays stable.
  // `hl` = the current highlight set; `tip` = tooltip text + position.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hl, setHl] = useState<{ nodeIds: Set<string>; linkIdx: Set<number> } | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  if (tree.filter(isShown).length === 0) return null;

  // Flatten the shown tree into Sankey nodes + links. The user's chances are
  // CONDITIONAL (relative to siblings), so we size each flow by ABSOLUTE path
  // probability — the parent's absolute share split among its children in
  // proportion to their chances. That keeps every node's inflow equal to the
  // sum of its outflows, so the widths add up. Labels still show the raw chance.
  const ROOT = "__decision__";
  const nodes: SankeyDatum[] = [{ id: ROOT, name: title.trim() || "Decision", outcome: "neutral", chance: null }];
  const links: SankeyFlow[] = [];
  let maxDepth = 0;
  const perDepth: number[] = [1]; // the decision node sits alone at depth 0

  const walk = (siblings: ScenarioNode[], parentId: string, parentAbs: number, depth: number) => {
    const shown = siblings.filter(isShown);
    if (shown.length === 0) return;
    // Normalise sibling chances into shares of the parent's flow (missing → 1).
    const weights = shown.map((n) => Math.max(0.001, parseChance(n.chance) ?? 1));
    const total = weights.reduce((a, b) => a + b, 0);
    shown.forEach((n, i) => {
      const abs = parentAbs * (weights[i]! / total);
      nodes.push({ id: n.id, name: n.name.trim() || "Branch", outcome: n.outcome, chance: parseChance(n.chance) });
      links.push({ source: parentId, target: n.id, value: Math.max(0.01, abs) });
      maxDepth = Math.max(maxDepth, depth);
      perDepth[depth] = (perDepth[depth] ?? 0) + 1;
      walk(n.children, n.id, abs, depth + 1);
    });
  };
  walk(tree, ROOT, 100, 1);
  if (links.length === 0) return null;

  // Size from the graph so deeper/wider trees grow (and the wrapper scrolls).
  const maxLayer = Math.max(1, ...perDepth);
  const innerW = 70 + maxDepth * 175; // node columns
  const W = innerW + 180; // + room for right-hand labels
  const H = Math.max(170, maxLayer * 30 + 24);

  const graph = sankey<SankeyDatum, SankeyFlow>()
    .nodeId((d) => d.id)
    .nodeWidth(12)
    .nodePadding(13)
    .nodeAlign(sankeyJustify)
    .extent([
      [6, 12],
      [innerW, H - 12],
    ])({
    nodes: nodes.map((d) => ({ ...d })),
    links: links.map((d) => ({ ...d })),
  });
  const linkPath = sankeyLinkHorizontal<SankeyDatum, SankeyFlow>();

  // Track the pointer within the (scrollable) wrapper so the tooltip follows it.
  const tipAt = (e: { clientX: number; clientY: number }, text: string) => {
    const r = wrapRef.current?.getBoundingClientRect();
    setTip({ text, x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) });
  };
  // Hovering a node lights up the node and every flow touching it.
  const hoverNode = (n: SNode) => {
    const linkIdx = new Set<number>();
    const nodeIds = new Set<string>([n.id]);
    graph.links.forEach((l, i) => {
      const s = (l.source as SNode).id;
      const t = (l.target as SNode).id;
      if (s === n.id || t === n.id) {
        linkIdx.add(i);
        nodeIds.add(s);
        nodeIds.add(t);
      }
    });
    setHl({ nodeIds, linkIdx });
  };
  const clear = () => {
    setHl(null);
    setTip(null);
  };

  // The decision node renders in brand blue; everything downstream takes its
  // outcome colour. Links blend source → target via per-link gradients.
  const nodeColor = (n: SankeyDatum | SNode) =>
    n.id === ROOT ? "var(--vizithink-accent)" : outcomeColor(n.outcome);

  return (
    <div ref={wrapRef} style={{ marginTop: 12, position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--vizithink-text-subtle)",
          }}
        >
          Scenario flow
        </span>
        <span style={{ display: "flex", gap: 10 }}>
          {OUTCOME_CYCLE.slice().reverse().map((o) => (
            <span
              key={o}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                color: "var(--vizithink-text-subtle)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: OUTCOME_META[o].color,
                  display: "inline-block",
                }}
              />
              {OUTCOME_META[o].label}
            </span>
          ))}
        </span>
      </div>
      <div
        style={{
          overflowX: "auto",
          borderRadius: 10,
          border: "1px solid var(--vizithink-border-soft)",
          background:
            "radial-gradient(420px 160px at 12% 0%, rgba(110, 168, 254, 0.06), transparent 70%), var(--vizithink-bg)",
          padding: "6px 8px",
        }}
      >
      <svg width={W} height={H} style={{ display: "block", maxWidth: "none" }} onMouseLeave={clear}>
        <defs>
          {graph.links.map((l, i) => {
            const source = l.source as SNode;
            const target = l.target as SNode;
            return (
              <linearGradient
                key={i}
                id={`vt-sk-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={source.x1 ?? 0}
                x2={target.x0 ?? 0}
                y1={0}
                y2={0}
              >
                <stop offset="0%" stopColor={nodeColor(source)} stopOpacity={0.75} />
                <stop offset="100%" stopColor={nodeColor(target)} />
              </linearGradient>
            );
          })}
        </defs>
        {graph.links.map((l, i) => {
          const source = l.source as SNode;
          const target = l.target as SNode;
          const tipText = `${truncate(source.name, 26)} → ${truncate(target.name, 26)}${target.chance != null ? ` · ${Math.round(target.chance)}%` : ""}`;
          const opacity = hl ? (hl.linkIdx.has(i) ? 0.9 : 0.07) : 0.45;
          return (
            <path
              key={i}
              d={linkPath(l) ?? undefined}
              fill="none"
              stroke={`url(#vt-sk-${i})`}
              strokeWidth={Math.max(1.5, l.width ?? 1)}
              strokeOpacity={opacity}
              style={{ cursor: "pointer", transition: "stroke-opacity 120ms ease" }}
              onMouseEnter={(e) => {
                setHl({ nodeIds: new Set([source.id, target.id]), linkIdx: new Set([i]) });
                tipAt(e, tipText);
              }}
              onMouseMove={(e) => tipAt(e, tipText)}
              onMouseLeave={clear}
            />
          );
        })}
        {graph.nodes.map((n) => {
          const x0 = n.x0 ?? 0;
          const x1 = n.x1 ?? 0;
          const y0 = n.y0 ?? 0;
          const y1 = n.y1 ?? 0;
          const cy = (y0 + y1) / 2;
          const dimmed = hl != null && !hl.nodeIds.has(n.id);
          const lit = hl != null && hl.nodeIds.has(n.id);
          const meta = OUTCOME_META[n.outcome];
          const clickable = onAsk != null && n.id !== ROOT;
          const tipText =
            n.id === ROOT
              ? n.name
              : `${n.name} · ${meta.label}${n.chance != null ? ` · ${Math.round(n.chance)}% likely` : ""}${clickable ? " — click to ask about this path" : ""}`;
          return (
            <g
              key={n.id}
              style={{ cursor: clickable ? "pointer" : "default", opacity: dimmed ? 0.22 : 1, transition: "opacity 120ms ease" }}
              onClick={clickable ? () => onAsk(n.id) : undefined}
              onMouseEnter={(e) => {
                hoverNode(n);
                tipAt(e, tipText);
              }}
              onMouseMove={(e) => tipAt(e, tipText)}
              onMouseLeave={clear}
            >
              <rect
                x={x0}
                y={y0}
                width={Math.max(1, x1 - x0)}
                height={Math.max(1, y1 - y0)}
                rx={3}
                fill={nodeColor(n)}
                stroke={lit ? "var(--vizithink-text)" : "none"}
                strokeWidth={lit ? 1 : 0}
              />
              <text
                x={x1 + 7}
                y={cy}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={n.id === ROOT ? 700 : 600}
                fill="var(--vizithink-text)"
              >
                {truncate(n.name, 22)}
                {n.chance != null && (
                  <tspan fill="var(--vizithink-text-subtle)" fontWeight={500}>
                    {`  ${Math.round(n.chance)}%`}
                  </tspan>
                )}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      {tip && (
        <div
          style={{
            position: "absolute",
            left: tip.x + 12,
            top: tip.y + 12,
            maxWidth: 280,
            padding: "5px 9px",
            borderRadius: 7,
            background: "var(--vizithink-surface)",
            border: "1px solid var(--vizithink-border)",
            color: "var(--vizithink-text)",
            fontSize: 11,
            lineHeight: 1.35,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 14px #0008",
            zIndex: 2,
          }}
        >
          {tip.text}
        </div>
      )}
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
  color: "var(--vizithink-text-subtle)",
  pointerEvents: "none",
};

function shell(accent: string): CSSProperties {
  return {
    width: "100%",
    maxWidth: 840,
    borderRadius: 12,
    background: "var(--vizithink-surface-2)",
    border: `1.5px solid ${accent}`,
    boxShadow: "0 1px 2px #0006",
    color: "var(--vizithink-text)",
    overflow: "hidden",
  };
}

function HeaderRow(props: {
  emoji: string;
  title: string;
  setTitle: (t: string) => void;
  setSent: (v: boolean) => void;
  onRemove: () => void;
  onHelp?: () => void;
}) {
  const { emoji, title, setTitle, setSent, onRemove, onHelp } = props;
  return (
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
          color: "var(--vizithink-text)",
          outline: "none",
        }}
      />
      {onHelp && (
        <button type="button" title="How to use this widget" onClick={onHelp} style={helpBtn}>
          ?
        </button>
      )}
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
        borderTop: "1px solid var(--vizithink-border-soft)",
        background: "var(--vizithink-surface)",
      }}
    >
      {sent && (
        <span style={{ marginRight: 10, fontSize: 12, color: "var(--vizithink-merged)" }}>Sent ✓</span>
      )}
      <button type="button" onClick={send} disabled={!hasContent} style={sendBtn(hasContent)}>
        {sent ? "Send again ↩" : "Send to chat ↩"}
      </button>
    </div>
  );
}

const colHeaderRow: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  padding: "0 0 5px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--vizithink-text-subtle)",
};

const inp: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
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
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px dashed var(--vizithink-border)",
  background: "transparent",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
};

const branchBtn: CSSProperties = {
  fontSize: 13,
  width: 24,
  height: 24,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text-muted)",
  cursor: "pointer",
  flexShrink: 0,
  padding: 0,
};

const removeBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  width: 24,
  height: 24,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
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
  border: "1px solid var(--vizithink-border)",
  background: enabled ? "var(--vizithink-accent-soft)" : "var(--vizithink-surface)",
  color: enabled ? "var(--vizithink-text)" : "var(--vizithink-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
  whiteSpace: "nowrap",
});

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

const helpBtn: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  width: 20,
  height: 20,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-text-subtle)",
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
