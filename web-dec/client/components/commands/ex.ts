import { WIDGETS } from "../widgets/registry";
import type { ChatCommand } from "./types";

// `/ex` — example prompts. Bare `/ex` lists one example decision per core
// widget (numbered as its `/qN` quick question); `/ex <widget>` (e.g. `/ex eis`)
// sends that widget's example through the router exactly as if the user typed
// it — so they get a real LLM answer and the surfaced widget, prefilled. An
// unknown argument falls back to the list.
const command: ChatCommand = {
  names: ["ex", "example", "examples", "eg"],
  title: "Examples",
  description: "example decisions to try",
  order: 20,
  run: (ctx, { args }) => {
    const key = args.split(/\s+/)[0]?.toLowerCase();
    const entry = key
      ? WIDGETS.find((w) => w.spec.commands.includes(key) || w.spec.type === key)
      : undefined;
    if (entry) {
      void ctx.ask(entry.spec.example);
      return;
    }
    const rows = WIDGETS.filter((w) => !w.spec.draft).map(
      (w, i) =>
        `- \`/q${i + 1}\` · \`/${w.spec.commands[0]}\` — **${w.spec.title}**: "${w.spec.example}"`,
    );
    ctx.say(
      [
        "**Example decisions** — type `/q1`, `/q2`, … to run one (or `/ex <name>`, e.g. `/ex eis`), or just describe your own:",
        "",
        ...rows,
      ].join("\n"),
    );
  },
};

export default command;
