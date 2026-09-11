import { WIDGETS } from "../widgets/registry";
import type { ChatCommand } from "./types";

// `/drafts` — list the experimental widgets hidden from the main `/help` and
// `/ex` menus and from the LLM router (still openable by their slash command).
const command: ChatCommand = {
  names: ["drafts", "draft", "experimental", "wip"],
  title: "Drafts",
  description: "experimental tools not in the main set",
  help: "experimental tools not yet in the main set",
  order: 600,
  run: (ctx) => {
    const drafts = WIDGETS.filter((w) => w.spec.draft);
    if (drafts.length === 0) {
      ctx.say("No draft widgets right now.", { markdown: true });
      return;
    }
    ctx.say(
      [
        "## Draft widgets",
        "_Experimental — not auto-suggested; open by command._",
        "",
        ...drafts.map((w) => `- \`/${w.spec.commands[0]}\` — **${w.spec.title}**: ${w.spec.description}`),
        "",
        "Type `/help <name>` for how one works, or `/<name>` to open it.",
      ].join("\n"),
      { markdown: true },
    );
  },
};

export default command;
