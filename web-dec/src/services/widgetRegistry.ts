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
    type: "procon",
    title: "Pros & Cons",
    purpose:
      "Weigh a single option by laying its upsides against its downsides — good for go/no-go calls.",
  },
  {
    type: "options",
    title: "Options A/B",
    purpose:
      "Choose between exactly two options by scoring them across the decision points that matter — see at a glance which option wins on more counts.",
  },
  {
    type: "options",
    title: "Options A/B",
    purpose:
      "Choose between exactly two options by scoring them across the decision points that matter — see at a glance which option wins on more counts.",
  },
  {
    type: "twobytwo",
    title: "2×2 grid",
    purpose:
      "Place ideas in four buckets on two axes; swap quadrant text when your framing shifts.",
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
  {
    type: "decisionmatrix",
    title: "Decision matrix",
    purpose:
      "Compare multiple options numerically against criteria you can weight.",
  },
  {
    type: "costbenefit",
    title: "Cost–benefit",
    purpose:
      "Make tradeoffs explicit—especially when you can attach rough numbers to each side.",
  },
  {
    type: "premortem",
    title: "Pre-mortem",
    purpose:
      "Surface failure modes before you commit—especially for hard-to-reverse choices.",
  },
  {
    type: "decisiontree",
    title: "Decision tree",
    purpose:
      "Lay out conditional paths so downstream outcomes and forks stay visible.",
  },
  {
    type: "expectedvalue",
    title: "Expected value",
    purpose:
      "Weight uncertain outcomes by probability for risk-return style comparisons.",
  },
  {
    type: "ooda",
    title: "OODA / first principles",
    purpose:
      "Break a stuck decision by cycling facts, models, commitment, and action—and by reframing from basics.",
  },
  {
    type: "regret",
    title: "Regret minimisation",
    purpose:
      "Clarify values by comparing how you'd feel years later about each path.",
  },
];
