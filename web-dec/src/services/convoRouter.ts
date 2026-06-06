// Pure, dependency-free heuristics for the conversation router. Used as the
// fallback path when no LLM is configured (the primary path is the LLM call in
// src/trpc/routers/chat.ts). Lives in src/services so the server can import it.

export interface WidgetInfo {
  type: string;
  title: string;
  purpose: string;
  description?: string;
}

// Phrasings that signal the user is weighing, prioritising, or choosing.
const DECISION_PATTERNS: RegExp[] = [
  /\bshould (i|we|you)\b/,
  /\b(decide|deciding|decision|choose|choosing|choice|pick|picking)\b/,
  /\bpriorit(?:y|ies|ise|ize|isation|ization)\b/,
  /\b\w+\s+(?:or|vs\.?|versus)\s+\w+/, // "rent or buy", "A vs B"
  /\bworth (it|the)\b/,
  /\b(which|what)\b.*\b(should|better|best|next|do)\b/,
];

export function isDecision(input: string): boolean {
  const t = input.toLowerCase();
  return DECISION_PATTERNS.some((re) => re.test(t));
}

const STOP = new Set([
  "the", "and", "for", "you", "your", "with", "what", "which", "this", "that",
  "are", "was", "should", "would", "could", "have", "has", "had", "but", "not",
  "out", "now", "can", "into", "from", "about", "their", "them", "they", "need",
  "good", "help", "decide", "decision", "choose", "choice", "pick", "want",
]);

function tokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (w.length >= 3 && !STOP.has(w)) out.add(w);
  }
  return out;
}

// Best widget by token overlap of the input against each widget's
// purpose/title/description. Falls back to the first widget.
export function matchWidget(input: string, widgets: WidgetInfo[]): WidgetInfo | null {
  if (widgets.length === 0) return null;
  const want = tokens(input);
  let best: { w: WidgetInfo; score: number } = { w: widgets[0], score: -1 };
  for (const w of widgets) {
    const hay = tokens(`${w.purpose} ${w.title} ${w.description ?? ""}`);
    let score = 0;
    for (const t of want) if (hay.has(t)) score++;
    if (score > best.score) best = { w, score };
  }
  return best.w;
}

// Split a line into its candidate choices: "buy a house or buy a car" →
// ["buy a house", "buy a car"]. Returns [] when there's no clear split.
export function extractChoices(input: string): string[] {
  const parts = input
    .split(/\s+(?:or|vs\.?|versus)\s+|\s*,\s*|\s*\/\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : [];
}

export interface HeuristicRoute {
  widget: string | null;
  title: string | null;
  items: string[];
}

export function routeHeuristic(input: string, widgets: WidgetInfo[]): HeuristicRoute {
  if (!isDecision(input)) return { widget: null, title: null, items: [] };
  const m = matchWidget(input, widgets);
  if (!m) return { widget: null, title: null, items: [] };
  return { widget: m.type, title: m.title, items: extractChoices(input) };
}
