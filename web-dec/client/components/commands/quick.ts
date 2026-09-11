import { QUICK_QUESTIONS } from "../widgets/registry";
import type { ChatCommand } from "./types";

// Quick questions — `/q1` or bare `q1` (…qN) sends the Nth `/ex` example
// decision through the router as if the user typed it. The full question, not
// the shortcut, shows as their message.
const keyOf = (line: string) => line.trim().replace(/^\//, "").toLowerCase();

const command: ChatCommand = {
  names: Object.keys(QUICK_QUESTIONS),
  title: "Quick question",
  description: "run an example decision",
  order: 950,
  // /help has its own quick-questions section.
  hideFromHelp: true,
  slash: () =>
    Object.entries(QUICK_QUESTIONS).map(([command, question]) => ({
      command,
      title: "Quick question",
      description: question,
    })),
  match: (line) => (QUICK_QUESTIONS[keyOf(line)] ? "" : null),
  run: (ctx, { line }) => {
    const question = QUICK_QUESTIONS[keyOf(line)];
    if (question) void ctx.ask(question);
  },
};

export default command;
