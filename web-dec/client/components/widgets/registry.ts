// Widget registry — pairs each widget's spec (trigger + output contract) with
// its React component. The chat view consults this to (a) match a slash command
// to a widget and (b) render a widget instance by its `type`.
//
// To add a widget: create `<name>.spec.ts` + `<name>Widget.tsx`, then append an
// entry below. Nothing else in the chat view needs to change.

import type { ComponentType } from "react";
import type { WidgetProps, WidgetSpec } from "./types";
import { proConSpec } from "./procon.spec";
import { ProConWidget } from "./ProConWidget";
import { eisenhowerSpec } from "./eisenhower.spec";
import { EisenhowerWidget } from "./EisenhowerWidget";

export interface WidgetEntry {
  spec: WidgetSpec;
  component: ComponentType<WidgetProps>;
}

export const WIDGETS: WidgetEntry[] = [
  { spec: proConSpec as WidgetSpec, component: ProConWidget },
  { spec: eisenhowerSpec as WidgetSpec, component: EisenhowerWidget },
];

// Parse a composer line. Returns the matched widget (and the trailing args,
// e.g. "/pc move to Berlin" → args "move to Berlin") or null if it isn't a
// recognised "/command".
export function matchWidgetCommand(
  input: string,
): { entry: WidgetEntry; args: string } | null {
  if (!input.startsWith("/")) return null;
  const [word, ...rest] = input.slice(1).trim().split(/\s+/);
  const key = word.toLowerCase();
  const entry = WIDGETS.find((w) => w.spec.commands.includes(key));
  if (!entry) return null;
  return { entry, args: rest.join(" ") };
}

export function getWidget(type: string): WidgetEntry | null {
  return WIDGETS.find((w) => w.spec.type === type) ?? null;
}
