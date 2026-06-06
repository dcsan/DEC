// Client-side slash commands for the chat composer. If the user's input
// starts with "/", ChatSidebar matches it against this array (by `keys`)
// and runs the handler INSTEAD of sending the text to the server.
//
// To add a command: append an entry with its trigger `keys`, a title, a
// description, and a `run` handler. Handlers receive a SlashContext of
// injected actions so this file stays free of React/tRPC imports.

export interface SlashContext {
  /** Everything after the command word, e.g. "/pc should I move?" → "should I move?" */
  args: string;
  /** Add a pros/cons matrix widget to the canvas with the given title. */
  addProCon: (title: string) => void;
}

export interface SlashCommand {
  /** Trigger words (without the leading slash). First is the canonical one. */
  keys: string[];
  title: string;
  description: string;
  run: (ctx: SlashContext) => void;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    keys: ["pc", "procon", "proscons", "pros-cons"],
    title: "Pros & Cons",
    description: "Add a pros/cons matrix widget to the canvas",
    run: ({ args, addProCon }) => addProCon(args.trim() || "Pros & Cons"),
  },
];

export interface SlashMatch {
  command: SlashCommand;
  args: string;
}

// Returns the matched command + args, or null if the input isn't a slash
// command (or the word isn't recognised).
export function matchSlashCommand(input: string): SlashMatch | null {
  if (!input.startsWith("/")) return null;
  const [word, ...rest] = input.slice(1).trim().split(/\s+/);
  const key = word.toLowerCase();
  const command = SLASH_COMMANDS.find((c) => c.keys.includes(key));
  if (!command) return null;
  return { command, args: rest.join(" ") };
}
