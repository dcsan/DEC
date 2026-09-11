import { uid } from "./helpers";
import type { ChatCommand } from "./types";

// `/viz [decision]` — ask the LLM to draw an SVG system diagram of the current
// decision (explicit args win, else the current decision) and inject it inline.
const command: ChatCommand = {
  names: ["viz", "visualize", "visualise", "diagram"],
  title: "Visualise",
  description: "diagram the current decision",
  help: "visualise the current decision as a diagram",
  order: 210,
  run: async (ctx, { args }) => {
    const question = args.trim() || ctx.lastDecision();
    if (!question) {
      ctx.say("Nothing to visualise yet — describe a decision first, or run `/viz <your decision>`.");
      return;
    }
    ctx.echo(`/viz ${question}`);
    const res = await ctx.busy(
      "Visualising",
      () => ctx.api.viz.run.mutate({ question, history: ctx.toHistory() }),
      "Could not generate a diagram. Please try again.",
    );
    if (res) ctx.append({ kind: "viz", id: uid(), title: res.title, svg: res.svg });
  },
};

export default command;
