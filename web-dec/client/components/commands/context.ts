import { uid } from "./helpers";
import type { ChatCommand } from "./types";

// `/context` — drop an "Add context" panel into the stream to attach a text
// document to the session (stored in Honcho, retrievable by later turns).
const command: ChatCommand = {
  names: ["context", "ctx", "doc"],
  title: "Add context",
  description: "attach a document",
  help: "attach a text document as context for this chat",
  order: 500,
  run: (ctx) => {
    ctx.append({ kind: "context", id: uid() });
  },
};

export default command;
