---
name: widget-creator
description: >-
  Scaffolds a new chat widget for the DEC `/chat` view — a self-contained
  interactive tool dropped in via a slash command (e.g. `/pc`, `/eis`) that
  posts both a structured payload and a plain-text rendering back to chat. Use
  this whenever the user wants to add, build, or scaffold a new widget, a new
  decision/thinking tool for the chat, a new `/command` mini-tool, or hands you
  a widget spec like docs/specs/*.md and asks to implement it — even if they
  just say "make a widget for X" without naming the framework. Lives in
  web-dec/client/components/widgets/.
---

# Widget creator

A **widget** is a small, standalone interactive tool that drops into the DEC
chat stream (`web-dec/client/components/ChatView.tsx`) when the user types a
slash command, gets filled in, and on **Send** posts two things back through the
server: a **structured payload** (`data`, for the agent to act on) and a
**plain-text rendering** (`text`, from the spec's `format()`, for display and
for feeding an LLM).

Everything lives in `web-dec/client/components/widgets/`. Widgets are
deliberately plain: React + local state only. **No react-flow, no shared store,
no server changes** — `ChatView` and the chat router are already generic over
the registry.

## The shape of every widget

Each widget is **two files, kept separate on purpose** plus **one registry
line**:

| File | Role | React? |
|------|------|--------|
| `<name>.spec.ts` | The **contract**: `type`, `commands`, `title`, `description`, `purpose`, the `TData` interfaces, and `format(data)`. | No — pure |
| `<name>Widget.tsx` | The **UI**: owns live state, renders the form, calls `spec.format` on Send. | Yes |
| `registry.ts` | One appended line pairing the spec with the component. | — |

The split keeps output-formatting logic in one obvious, React-free place and
avoids a circular import (the component imports the spec; the registry pairs
them). Match this — don't inline the format function into the component or merge
the files.

## Before you write — read the existing widgets

The two shipped widgets ARE the style guide. Read them so the new one looks like
it was written by the same hand:

- `web-dec/client/components/widgets/types.ts` — the `WidgetSpec` / `WidgetProps`
  / `WidgetOutput` contracts. Never edit this.
- `web-dec/client/components/widgets/procon.spec.ts` + `ProConWidget.tsx` — the
  simplest case: a fixed list of editable rows with checkboxes. Start here if the
  new widget is form-like.
- `web-dec/client/components/widgets/eisenhower.spec.ts` +
  `EisenhowerWidget.tsx` — the richer case: drag-and-drop chips into zones, a
  seed pool, a free-text "add" input. Start here if the new widget needs
  placement, grouping, or drag interaction.
- `web-dec/client/components/widgets/registry.ts` — where the new widget gets
  wired in.

Pick whichever existing widget is closest to what's being asked and adapt it,
rather than writing from a blank file. The visual shell (header / body / footer)
should be near-identical across widgets — only the body changes.

## Workflow

### 1. Pin down the decision the widget supports

A widget exists to help the user make a specific decision and then hand a clean,
structured summary to the agent. Before coding, get clear on:

- **Purpose** — what decision is this good for? (goes in `spec.purpose`, and the
  user often states it explicitly — the Eisenhower spec asked for a `purpose`
  field describing "what this chart is good for").
- **The structured data shape** (`TData`) — the minimal fields the agent needs.
- **The interaction** — how the user fills it in (rows + checkboxes? drag into
  zones? a slider? ranking?).
- **The plain-text rendering** — how `format(data)` turns the data into text an
  AI agent reads directly.

If the user handed you a spec doc (e.g. `docs/specs/<thing>.md`), extract these
four from it. If any is unclear, ask — especially the data shape and the
plain-text format, since those are the contract.

### 2. Write `<name>.spec.ts`

Use `assets/spec.template.ts` as the starting point. Fill in:

- `type` — stable kebab/lowercase id, matches the registry and chat items.
- `commands` — slash triggers **without** the leading slash; first is canonical.
  Give 2–4 (a short alias + the full word), and check `registry.ts` so none
  collide with an existing widget's commands.
- `title`, `description` (one line, for menus), `purpose` (the decision use).
- The `TData` interface(s) — export them; the component imports them.
- `format(data)` — see "Writing format()" below.

Optionally export a `blank<Name>Data(...)` seed helper (procon does this) so the
component and any caller agree on the initial state.

### 3. Write `<name>Widget.tsx`

Use `assets/Widget.template.tsx` as the starting point. It already implements the
conventions every widget shares:

- Takes `{ onSend, onRemove }: WidgetProps`.
- Owns all state locally with `useState`. No external store.
- A `sent` boolean that shows "Sent ✓" / "Send again ↩"; **any edit clears it**
  (the widget stays live and re-sendable — route every state mutation through a
  helper that also does `setSent(false)`).
- A "Send" handler that builds `data`, then calls
  `onSend({ type: spec.type, data, text: spec.format(data) })` — always send
  both forms, always via `spec.format` (never re-implement the text in the
  component).
- Send is disabled until there's real content to send.

The visual shell — bordered card, header with an editable title + a `⨯` remove
button, body, footer with the Send button — should match the existing widgets.
Use the **design tokens** (CSS variables), never hardcoded colors. See
`references/contract.md` for the token list and the shared style objects.

### 4. Register it

Append one entry to `WIDGETS` in `registry.ts` and add the two imports:

```ts
import { fooSpec } from "./foo.spec";
import { FooWidget } from "./FooWidget";
// ...
export const WIDGETS: WidgetEntry[] = [
  { spec: proConSpec as WidgetSpec, component: ProConWidget },
  { spec: eisenhowerSpec as WidgetSpec, component: EisenhowerWidget },
  { spec: fooSpec as WidgetSpec, component: FooWidget },   // ← new
];
```

Nothing in `ChatView` or the server (`src/trpc/routers/chat.ts`) needs to
change — both are generic over the registry and the `WidgetOutput` shape.

### 5. Verify it compiles

Run the project's typecheck/build for `web-dec` (e.g. `npm run build` or
`tsc --noEmit` in `web-dec`) and fix any type errors before reporting done. The
most common slip is the `TData` generic not matching between the spec and the
component.

## Writing `format()` — the heart of the spec

`format` is a **pure template**: structured data in, agent-friendly plain text
out. It's the widget's voice in the chat. Principles, drawn from the shipped
widgets:

- **Write for an LLM reader, not a UI.** The text should let an agent act on the
  result without seeing the widget. Label things in plain language.
- **Group and label by meaning, not by raw fields.** Eisenhower doesn't dump
  `{important:1,urgent:0}`; it writes `Important but not urgent tasks: …`.
  Translate the structured flags into the human concept they represent.
- **Omit the empty.** Skip blank rows, empty groups, untouched quadrants — only
  emit what the user actually filled in. (Pros & Cons does show `- (none)` under
  a heading to make "no cons" explicit; use that when absence is meaningful,
  otherwise drop the section.)
- **Keep it deterministic and dependency-free** — pure string building, no React,
  no `Date.now()`/randomness.

**Example — Eisenhower:**

Input: `{ entries: [{text:"Pay taxes",important:1,urgent:0}, {text:"Reply on Slack",important:0,urgent:1}] }`

Output:
```
Here is a list of tasks
Important but not urgent tasks: Pay taxes
Urgent but not important tasks: Reply on Slack
```

**Example — Pros & Cons:**

Output:
```
**Pros & Cons — Move to Berlin**

Pros (1):
- Cheaper rent

Cons (1):
- Leaving friends
```

Pick whichever register fits: a prose-y "Here is a list of …" reads well for an
agent, a markdown summary reads well for display. Both are valid — choose based
on what the downstream agent needs to do with it.

## Design tokens & shared styles

Use the `--dec-*` CSS variables for every color so widgets match the dark theme
and stay themeable. The full token list and the reusable style objects (the
card, header, `iconBtn`, `sendBtn`, row inputs) are in
`references/contract.md` — read it when styling the component.

## Reference

- `references/contract.md` — the full type contracts, the design-token table,
  the chat send-flow, and the shared style objects, in one place.
- `assets/spec.template.ts` — annotated starting point for the spec file.
- `assets/Widget.template.tsx` — annotated starting point for the component,
  with the shell already built.
