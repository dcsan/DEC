import { matchUseCommand } from "../widgets/registry";
import { uid } from "./helpers";
import type { ChatCommand } from "./types";

// "use <widget> …" — force that widget, bypassing the router (e.g. "use sc to
// plan what to do next"). Echo the message (it's natural language), then drop
// the widget prefilled with the rest as the question.
const command: ChatCommand = {
  names: [],
  title: "Use a tool",
  description: "use <name> … — force a specific widget",
  order: 990,
  hideFromHelp: true,
  slash: () => [],
  match: (line) => matchUseCommand(line)?.args ?? null,
  run: (ctx, { line }) => {
    const use = matchUseCommand(line);
    if (!use) return;
    ctx.echo(line);
    ctx.append({
      kind: "widget",
      id: uid(),
      type: use.entry.spec.type,
      init: use.args ? { question: use.args } : undefined,
    });
  },
};

export default command;
