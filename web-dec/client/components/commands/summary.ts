import type { ChatCommand } from "./types";

// `/summary` — recall the session from Honcho and write a short recap.
const command: ChatCommand = {
  names: ["summary", "summarise", "summarize", "recap"],
  title: "Summary",
  description: "recap what you're deciding",
  help: "recap what you're deciding so far",
  order: 300,
  run: async (ctx) => {
    ctx.echo("/summary");
    const res = await ctx.busy(
      "Summarising",
      () => ctx.api.summary.run.mutate({ sessionId: ctx.sessionId, history: ctx.toHistory() }),
      "Could not summarise. Please try again.",
    );
    if (res) ctx.say(res.summary);
  },
};

export default command;
