// Fixed evaluation set for the convo router (src/trpc/routers/chat.ts → route()).
//
// Each case is a free-text decision and the widget `type` the router SHOULD
// surface for it. `type` values must match src/services/widgetRegistry.ts.
// `accept` lists additional widget types that are also defensible answers for
// genuinely fuzzy phrasings — the case passes if the router picks `expect` OR
// any `accept` entry. Keep `expect` as the single best answer.
//
// Coverage spans 11 of the 12 widgets; the spread is deliberately weighted to
// the choices that are easy to confuse (either/or → Factor Weighting vs the
// Decision matrix; yes/no money calls → Cost–benefit; plot-on-dimensions → 2×2).

export interface RouterCase {
  question: string;
  expect: string;
  accept?: string[];
  note?: string;
}

export const ROUTER_CASES: RouterCase[] = [
  // Factor Weighting (factors) — either/or & yes/no personal decisions.
  { question: "Should I get a dog or a cat?", expect: "factors" },
  { question: "Should I rent or buy a house?", expect: "factors", accept: ["costbenefit"] },
  { question: "Should I take the new job offer or stay where I am?", expect: "factors" },
  { question: "Should I move to Berlin or stay in London?", expect: "factors" },

  // Eisenhower — prioritise a list of tasks by urgency/importance.
  { question: "Help me prioritise my to-do list for this week.", expect: "eisenhower" },
  { question: "I have fifteen tasks today and don't know what to tackle first.", expect: "eisenhower", accept: ["twobytwo"] },

  // SWOT.
  { question: "What's the SWOT of launching my side project as a business?", expect: "swot" },

  // Scenario planning — name and explore possible futures.
  { question: "What futures should I prepare for if I quit to go freelance?", expect: "scenario" },
  { question: "Map out the best, worst, and likely cases if we expand overseas.", expect: "scenario" },

  // Cost–benefit — explicit, quantifiable tradeoffs.
  { question: "Lay out the costs and benefits of buying a delivery van for my bakery.", expect: "costbenefit" },
  { question: "Help me weigh the financial pros and cons of installing solar panels.", expect: "costbenefit" },

  // Pre-mortem — surface failure modes before committing.
  { question: "What could go wrong if we launch the product next month?", expect: "premortem" },
  { question: "Before we commit to the data migration, what failure modes should we expect?", expect: "premortem" },

  // Decision tree — conditional branches / if-then paths.
  { question: "Map out what happens if our funding round closes or falls through.", expect: "decisiontree", accept: ["scenario"] },
  { question: "Walk me through the if/then branches of accepting the acquisition offer.", expect: "decisiontree" },

  // Expected value — probabilities and payoffs.
  { question: "Should I take a bet with a 60% chance to win $500 or a sure $250?", expect: "expectedvalue" },

  // OODA / first principles — a stuck, hard-to-frame decision.
  { question: "I'm stuck on a hard decision — help me reason it out from first principles.", expect: "ooda" },

  // Regret minimisation — long-horizon, values-based.
  { question: "Would I regret it more in ten years if I stayed home or moved abroad?", expect: "regret", accept: ["factors"] },

  // 2×2 axes scatter — plot/compare options against two dimensions.
  { question: "Help me sort my product ideas by impact and effort.", expect: "twobytwo" },
  { question: "Compare a car and a motorbike on cost and safety.", expect: "twobytwo" },
];
