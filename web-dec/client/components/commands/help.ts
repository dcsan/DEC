import { QUICK_QUESTIONS, WIDGETS, widgetHelpDetail } from "../widgets/registry";
import type { ChatCommand } from "./types";

// `/help` — list every widget shortcut and chat command; `/help <name>` (e.g.
// `/help sc`) for one widget's how-to. The lists are built from WIDGETS and the
// registered commands, so they can't drift. The bubble renders MARKDOWN, where
// single newlines collapse — so every row is a `- ` list item.
const command: ChatCommand = {
  names: ["help", "h", "?", "commands"],
  title: "Help",
  description: "list commands, or /help <name>",
  order: 10,
  hideFromHelp: true,
  run: (ctx, { args }) => {
    const key = args.split(/\s+/)[0]?.toLowerCase();
    const entry = key
      ? WIDGETS.find((w) => w.spec.commands.includes(key) || w.spec.type === key)
      : undefined;
    if (entry) {
      ctx.say(widgetHelpDetail(entry), { markdown: true });
      return;
    }
    const widgets = WIDGETS.filter((w) => !w.spec.draft).map(
      (w) => `- \`/${w.spec.commands[0]}\` — **${w.spec.title}**: ${w.spec.description}`,
    );
    const chat = ctx.commands
      .filter((c) => !c.hideFromHelp && c.names.length)
      .map((c) => `- \`/${c.names[0]}\` — ${c.help ?? c.description}`);
    ctx.say(
      [
        "## Widget shortcuts",
        "",
        ...widgets,
        "",
        "**Chat commands**",
        "",
        ...chat,
        "",
        "**Quick questions**",
        "",
        `- \`/q1\` … \`/q${Object.keys(QUICK_QUESTIONS).length}\` — run the Nth example decision from \`/ex\``,
        "",
        "Or just describe a decision and I'll pick a tool. Force one with " +
          "`use <name>` (e.g. `use sc to plan what to do next`). Type " +
          "`/help <name>` (e.g. `/help sc`) for a specific tool.",
      ].join("\n"),
      { markdown: true },
    );
  },
};

export default command;
