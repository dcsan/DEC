// Scenario planning widget — see scenario.spec.ts.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trpc } from "../../lib/trpc";
import type { WidgetProps } from "./types";
import { blankScenarioData, parseChance, scenarioSpec, type ScenarioRow } from "./scenario.spec";

const ACCENT = "var(--dec-option)";

export function ScenarioWidget({ initial, onSend, onRemove }: WidgetProps) {
  const blank = blankScenarioData(initial?.title || "");
  const [title, setTitle] = useState(blank.title);
  const [scenarios, setScenarios] = useState<ScenarioRow[]>(blank.scenarios);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const more = trpc.suggest.more.useMutation();
  const suggest = trpc.scenario.suggest.useMutation();

  const edit = (next: ScenarioRow[]) => {
    setScenarios(next);
    setSent(false);
    setError(null);
  };

  const patch = (i: number, p: Partial<ScenarioRow>) =>
    edit(scenarios.map((s, idx) => (idx === i ? { ...s, ...p } : s)));

  const add = () => edit([...scenarios, { name: "", implications: "", chance: "" }]);
  const remove = (i: number) => edit(scenarios.filter((_, idx) => idx !== i));

  // The decision to seed the LLM with: what surfaced this widget, else the title.
  const seedQuestion = () => initial?.question?.trim() || title.trim();

  // Append more plausible futures from the LLM as fresh scenario rows.
  const generateMore = async () => {
    const q = seedQuestion();
    if (!q || more.isPending) return;
    setError(null);
    try {
      const out = await more.mutateAsync({
        question: q,
        itemNoun: "plausible future scenario",
        existing: scenarios.map((s) => s.name.trim()).filter(Boolean),
      });
      if (out.items.length) {
        setScenarios((cur) => [
          ...cur,
          ...out.items.map((name) => ({ name, implications: "", chance: "" })),
        ]);
        setSent(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate more.");
    }
  };

  // Draft a fresh spread of futures (name + implications + chance) and replace
  // the blank seed rows with them.
  const runSuggest = async () => {
    const q = seedQuestion();
    if (!q || suggest.isPending) return;
    setError(null);
    try {
      const out = await suggest.mutateAsync({ question: q });
      if (out.scenarios.length) {
        setScenarios(out.scenarios);
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

  const hasContent = scenarios.some((s) => s.name.trim() || s.implications.trim());

  const send = () => {
    if (!hasContent) return;
    const data = { title, scenarios };
    onSend({ type: scenarioSpec.type, data, text: scenarioSpec.format(data) });
    setSent(true);
  };

  return (
    <div style={shell(ACCENT)}>
      <HeaderRow emoji="🔭" title={title} setTitle={setTitle} setSent={setSent} onRemove={onRemove} />
      <p style={hint}>Plausible futures and what each would mean for you.</p>
      <div style={{ padding: "0 10px 8px" }}>
        {scenarios.map((s, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid var(--dec-border)" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                value={s.name}
                placeholder={`Scenario ${i + 1} name`}
                onChange={(e) => patch(i, { name: e.target.value })}
                style={{ ...inp, flex: 1 }}
              />
              <div style={{ position: "relative", width: 76, flexShrink: 0 }}>
                <input
                  value={s.chance}
                  placeholder="chance"
                  inputMode="decimal"
                  title="Chance this future occurs (e.g. 30 or 30%)"
                  onChange={(e) => patch(i, { chance: e.target.value })}
                  style={{ ...inp, paddingRight: 16, textAlign: "right" }}
                />
                <span style={pctSuffix}>%</span>
              </div>
            </div>
            <textarea
              value={s.implications}
              placeholder="Implications if this future happens…"
              onChange={(e) => patch(i, { implications: e.target.value })}
              rows={3}
              style={ta}
            />
            <button type="button" onClick={() => remove(i)} style={ghostBtn}>
              Remove scenario
            </button>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={add} style={addBtn}>
            + scenario
          </button>
          <button
            type="button"
            onClick={generateMore}
            disabled={!seedQuestion() || more.isPending}
            style={genBtn(!!seedQuestion() && !more.isPending)}
          >
            {more.isPending ? "Thinking…" : "✨ generate more"}
          </button>
          {error && <span style={{ fontSize: 11, color: "var(--dec-option)" }}>{error}</span>}
        </div>

        <ScenarioSankey scenarios={scenarios} />
      </div>
      <FooterRow sent={sent} hasContent={hasContent} send={send} />
    </div>
  );
}

// A lightweight Sankey: the decision (root bar on the left) fans out into the
// named scenarios on the right, each flow's thickness proportional to its
// chance. When no chances are entered the split is equal. Pure SVG — no library.
function ScenarioSankey({ scenarios }: { scenarios: ScenarioRow[] }) {
  const named = scenarios.filter((s) => s.name.trim() !== "");
  if (named.length === 0) return null;

  const raw = named.map((s) => parseChance(s.chance));
  const anyChance = raw.some((w) => w != null && w > 0);
  const weights = named.map((_, i) => (anyChance ? raw[i] ?? 0 : 1));
  const total = weights.reduce((a, w) => a + w, 0) || 1;
  const shares = weights.map((w) => w / total);

  const W = 420;
  const rowH = 34;
  const padY = 8;
  const innerH = named.length * rowH;
  const H = padY * 2 + innerH;
  const leftX = 16; // right edge of the root bar
  const nodeX = 250; // left edge of scenario node bars
  const midX = (leftX + nodeX) / 2;
  const minT = 4; // keep tiny shares visible

  const palette = [
    "var(--dec-option)",
    "var(--dec-concept)",
    "var(--dec-framework)",
    "var(--dec-merged)",
  ];

  let cum = padY; // source side: stack bands cumulatively over the height
  const bands = shares.map((sh, i) => {
    const t = Math.max(minT, sh * innerH);
    const yL0 = cum;
    const yL1 = cum + t;
    cum += t;
    const cY = padY + (i + 0.5) * rowH; // target side: centre on an even row
    return { i, yL0, yL1, yR0: cY - t / 2, yR1: cY + t / 2, cY, sh };
  });

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--dec-text-subtle)" }}>
        Likelihood flow
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
        <rect x={4} y={padY} width={12} height={innerH} rx={3} fill="var(--dec-text-subtle)" opacity={0.5} />
        {bands.map((b) => {
          const color = palette[b.i % palette.length];
          const d = `M ${leftX} ${b.yL0} C ${midX} ${b.yL0}, ${midX} ${b.yR0}, ${nodeX} ${b.yR0} L ${nodeX} ${b.yR1} C ${midX} ${b.yR1}, ${midX} ${b.yL1}, ${leftX} ${b.yL1} Z`;
          const label = named[b.i].name.trim() || `Future ${b.i + 1}`;
          return (
            <g key={b.i}>
              <path d={d} fill={color} opacity={0.45} />
              <rect x={nodeX} y={b.yR0} width={6} height={Math.max(minT, b.yR1 - b.yR0)} rx={2} fill={color} />
              <text x={nodeX + 12} y={b.cY} dominantBaseline="middle" fontSize={11} fill="var(--dec-text)">
                {truncate(label, 22)} · {Math.round(b.sh * 100)}%
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
  right: 6,
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

const hint: CSSProperties = { margin: "6px 10px 0", fontSize: 11, color: "var(--dec-text-subtle)" };

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

const ta: CSSProperties = {
  ...inp,
  resize: "vertical",
  fontFamily: "inherit",
  minHeight: 56,
};

const ghostBtn: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  border: "none",
  background: "transparent",
  color: "var(--dec-text-muted)",
  cursor: "pointer",
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
