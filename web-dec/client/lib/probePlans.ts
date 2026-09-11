// Per-question probing plans saved by /apply: for a question the user has
// asked before, the better probing questions (plus coaching) the convo router
// should ask instead of its own — sent along with chat.send. Per-browser
// (localStorage, mirrored in memory so a blocked storage still works for the
// page's lifetime). Keyed by the question normalised, so casing and
// punctuation don't matter.

export interface SavedProbePlan {
  questions: string[];
  guidance: string;
  rationale: string;
  /** The probing questions asked in the conversation the plan was built from. */
  previous: string[];
  appliedAt: number;
}

const STORAGE_KEY = "vt-probe-plans";
let cache: Record<string, SavedProbePlan> | null = null;

const normalise = (q: string) => q.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function load(): Record<string, SavedProbePlan> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, SavedProbePlan>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function store(plans: Record<string, SavedProbePlan>) {
  cache = plans;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // storage blocked — the plan lasts until the page reloads
  }
}

export function getProbePlan(question: string): SavedProbePlan | null {
  return load()[normalise(question)] ?? null;
}

export function saveProbePlan(question: string, plan: SavedProbePlan): void {
  store({ ...load(), [normalise(question)]: plan });
}

/** Remove the plan for a question; false if there wasn't one. */
export function clearProbePlan(question: string): boolean {
  const key = normalise(question);
  const plans = load();
  if (!(key in plans)) return false;
  const { [key]: _removed, ...rest } = plans;
  store(rest);
  return true;
}
