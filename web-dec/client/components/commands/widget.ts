import { WIDGETS, matchWidgetCommand } from "../widgets/registry";
import { uid } from "./helpers";
import type { ChatCommand } from "./types";

// A widget's own slash command (`/eis`, `/pc`, …) → drop that widget into the
// stream, carrying any trailing args as the original question (e.g. `/eis taxes
// vs twitter` → question "taxes vs twitter") for the final recommendation.
// Widgets are listed in /help separately, from WIDGETS.
const command: ChatCommand = {
  names: [],
  title: "Widget",
  description: "open a thinking tool",
  // First in the slash popup.
  order: 0,
  hideFromHelp: true,
  slash: () =>
    WIDGETS.filter((w) => !w.spec.draft).map((w) => ({
      command: w.spec.commands[0],
      title: w.spec.title,
      description: w.spec.description,
    })),
  match: (line) => matchWidgetCommand(line)?.args ?? null,
  run: (ctx, { line }) => {
    const match = matchWidgetCommand(line);
    if (!match) return;
    ctx.append({
      kind: "widget",
      id: uid(),
      type: match.entry.spec.type,
      init: match.args ? { question: match.args } : undefined,
    });
  },
};

export default command;
