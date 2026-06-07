// Server-side widget registry.
//
// The LLM convo router (src/trpc/routers/chat.ts) reads this table to choose the
// most relevant widget for a user's decision. It mirrors the client registry
// (client/components/widgets/registry.ts) but holds only what the router needs:
// the widget `type` (must match the client) plus a `title` and `purpose`.
//
// IMPORTANT: when you add a widget to the client registry, add it here too —
// otherwise the router can never route to it. Keep `type` identical on both
// sides, and keep `purpose` aligned with the widget's spec file.

import type { WidgetInfo } from "./convoRouter";

export const WIDGET_REGISTRY: WidgetInfo[] = [
  {
    type: "factors",
    title: "Factor Weighting",
    purpose:
      "Decide between two options, or a single yes/no choice (e.g. should I get a dog or a cat, buy or rent, join a startup or stay), by surfacing the factors that pull on the decision and ranking how much each one matters to YOU on a 1-5 scale. You don't score each option — you weight the factors — so the trade-off is explicit. This is the default tool for an either/or personal decision; prefer it over the decision matrix unless the user explicitly wants to score several options on numeric criteria.",
  },
  {
    type: "twobytwo",
    title: "2×2 comparison",
    purpose:
      "Compare two or more concrete options by positioning them on two automatically-derived axes (e.g. cost vs safety, impact vs effort) and scoring each 0-100 on both. Use when the user wants to visualise or plot options against dimensions; for weighing how much factors matter to them prefer Factor Weighting.",
  },
  {
    type: "eisenhower",
    title: "Eisenhower Matrix",
    purpose:
      "Prioritise tasks by importance and urgency to decide what to do next — do now, schedule, delegate, or drop.",
  },
  {
    type: "swot",
    title: "SWOT analysis",
    purpose:
      "Contrast internal strengths and weaknesses with external opportunities and threats.",
  },
  {
    type: "scenario",
    title: "Scenario planning",
    purpose:
      "Stress-test decisions by naming futures and spelling out what each would imply.",
  },
  // NOTE: draft widgets (costbenefit, premortem, decisiontree, expectedvalue,
  // ooda, regret) are intentionally omitted here so the router never
  // auto-surfaces them. They stay marked `draft: true` in their client specs
  // and remain reachable via their slash command and `/drafts`. Promote one by
  // dropping its `draft` flag and adding its `{ type, title, purpose }` back
  // here.
];
