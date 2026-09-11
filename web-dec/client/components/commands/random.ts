import type { ChatCommand } from "./types";

// `/random` — start a new chat with a random short decision question (written
// by the server's random.question) and send it through the convo router as if
// the user had typed it. Handy for watching the whole flow, 🧠 sidebar open.
const command: ChatCommand = {
  names: ["random", "rand", "surprise"],
  title: "Random question",
  description: "new chat with a random decision question",
  order: 910,
  run: async (ctx) => {
    const res = await ctx.busy(
      "Picking a question",
      () => ctx.api.random.question.mutate(),
      "Couldn't pick a random question. Please try again.",
    );
    // newSession asks it once the fresh session has rendered.
    if (res) ctx.newSession({ question: res.question });
  },
};

export default command;
