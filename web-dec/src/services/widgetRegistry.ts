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
    type: "eisenhower",
    title: "Eisenhower Matrix",
    purpose:
      "Prioritise tasks by importance and urgency to decide what to do next — do now, schedule, delegate, or drop.",
  },
];
