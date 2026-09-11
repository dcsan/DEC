import type { ChatCommand } from "./types";

// `/session` — show the current client session id (handled locally), so you
// can look this conversation up in Honcho or /admin/logs.
const command: ChatCommand = {
  names: ["session", "sid", "sessionid"],
  title: "Session",
  description: "show the current session id",
  order: 800,
  run: (ctx) => {
    ctx.echo("/session");
    ctx.say(`**Session id**\n\n\`${ctx.sessionId}\``, { markdown: true });
  },
};

export default command;
