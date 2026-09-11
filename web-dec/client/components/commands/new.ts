import type { ChatCommand } from "./types";

// `/new` — start a fresh conversation: clear the stream and rotate the session
// id so the server (Honcho, chat_logs) tracks this as a new, separate decision.
const command: ChatCommand = {
  names: ["new", "newchat", "reset"],
  title: "New chat",
  description: "start a fresh conversation",
  order: 900,
  run: (ctx) => {
    ctx.newSession();
  },
};

export default command;
