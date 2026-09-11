// Slash-command registry. Every other file in this folder default-exports one
// ChatCommand and is picked up automatically, so adding or editing a command
// never touches ChatView, this file, or another command's file.
//
// Not commands: index.ts (this), types.ts, helpers.ts.

import type { ChatCommand, SlashRow } from "./types";

const modules = import.meta.glob<{ default?: ChatCommand }>(
  ["./*.ts", "!./index.ts", "!./types.ts", "!./helpers.ts"],
  { eager: true },
);

export const COMMANDS: ChatCommand[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([file, mod]) => {
    if (mod.default) return [mod.default];
    console.warn(`[commands] ${file} has no default export — skipped`);
    return [];
  })
  // Array.sort is stable, so equal orders keep file-name order.
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

// First match wins, so a name claimed twice would silently shadow one command.
if (import.meta.env.DEV) {
  const owner = new Map<string, string>();
  for (const c of COMMANDS) {
    for (const n of c.names) {
      const prev = owner.get(n);
      if (prev) console.warn(`[commands] /${n} is claimed by both "${prev}" and "${c.title}"`);
      owner.set(n, c.title);
    }
  }
}

/**
 * The command a composer line triggers, with its args: a `/name` match first,
 * then each command's custom `match` in order. Null → plain chat text.
 */
export function findCommand(line: string): { command: ChatCommand; args: string } | null {
  const trimmed = line.trim();
  if (trimmed.startsWith("/")) {
    const [word = "", ...rest] = trimmed.slice(1).trim().split(/\s+/);
    const key = word.toLowerCase();
    const command = COMMANDS.find((c) => c.names.includes(key));
    if (command) return { command, args: rest.join(" ") };
  }
  for (const command of COMMANDS) {
    const args = command.match?.(trimmed);
    if (args != null) return { command, args };
  }
  return null;
}

/** Every row for the composer's `/` autocomplete popup. */
export function slashRows(): SlashRow[] {
  return COMMANDS.flatMap((c) =>
    c.slash
      ? c.slash()
      : c.names.length
        ? [{ command: c.names[0], title: c.title, description: c.description }]
        : [],
  );
}
