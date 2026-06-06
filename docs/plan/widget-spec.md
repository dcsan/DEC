# Widget spec

How widgets work in the standalone chat view (`/chat`). A **widget** is a small,
self-contained interactive tool that can be dropped into the chat with a slash
command (e.g. `/pc`, `/eis`), filled in, and then "sent" — posting both a
**structured payload** and a **plain-text rendering** back through the server.

Everything lives in `web-dec/client/components/widgets/`. Widgets are deliberately
simple and standalone: plain React + local state, **no react-flow**, no shared
store.

## Anatomy of a widget

Each widget is two files, kept separate on purpose:

| File | Role | React? |
|------|------|--------|
| `<name>.spec.ts` | The **contract**: type id, triggers, purpose, and how data is formatted into chat text. | No — pure |
| `<name>Widget.tsx` | The **UI**: owns the widget's live state, calls the spec's `format()` on send. | Yes |

Splitting them keeps the output-formatting logic in one obvious, React-free place
and avoids a circular import (the component imports the spec; the registry pairs
the spec with the component).

### The spec (`WidgetSpec<TData>`)

Defined in `widgets/types.ts`:

```ts
export interface WidgetSpec<TData = unknown> {
  type: string;          // stable id, matches the registry + chat items
  commands: string[];    // slash triggers, no leading slash; first is canonical
  title: string;         // human label
  description: string;   // one-line description for hints/menus
  purpose: string;       // what this widget is good for — its decision-making use
  format: (data: TData) => string;  // structured data -> plain-text rendering
}
```

`format` is the heart of the spec: a **pure template** that turns the widget's
structured data into text an AI agent can read directly.

### The component (`WidgetProps`)

```ts
export interface WidgetProps {
  onSend: (output: WidgetOutput) => void;  // send result back to chat
  onRemove: () => void;                     // remove this instance
}
```

The component owns its own state, and on "Send" builds a `WidgetOutput` and hands
it up. It stays in place after sending (re-sendable) and shows a "Sent ✓" / "Send
again" state that any edit clears.

## The output contract

Every widget sends **both** forms in one object — `WidgetOutput`:

```ts
export interface WidgetOutput<TData = unknown> {
  type: string;   // which widget produced it (== WidgetSpec.type)
  data: TData;    // structured payload — the raw data
  text: string;   // plain-text rendering, from spec.format(data)
}
```

- **Structured** (`data`) — for the server/agent to act on programmatically.
- **Plain text** (`text`) — produced by `spec.format(data)`, for display and for
  feeding an LLM.

The widget assembles it on send:

```ts
onSend({ type: spec.type, data, text: spec.format(data) });
```

## Registry

`widgets/registry.ts` pairs each spec with its component and provides matching:

```ts
export const WIDGETS: WidgetEntry[] = [
  { spec: proConSpec,     component: ProConWidget },
  { spec: eisenhowerSpec, component: EisenhowerWidget },
];

matchWidgetCommand(input)  // "/pc move to Berlin" -> { entry, args: "move to Berlin" }
getWidget(type)            // type -> WidgetEntry, for rendering by type
```

## Chat flow

1. User types `/<command>` → `ChatView` matches it via `matchWidgetCommand` and
   drops the widget inline into the stream.
2. User fills the widget and clicks **Send**.
3. The widget calls `onSend({ type, data, text })`.
4. `ChatView` posts `{ text, widget: { type, data } }` to the server
   (`trpc.chat.send`). The widget stays in place; only the server reply is shown
   (no duplicate echo of the widget's own output).
5. Server (`src/trpc/routers/chat.ts`) logs the structured payload + text and
   returns a reply, which appears as an assistant bubble.

Typed (non-slash) messages go through the same `chat.send` endpoint with just
`text`; those echo the user's message too, since there's no widget UI showing it.

## Adding a new widget

1. Create `<name>.spec.ts` — declare `type`, `commands`, `title`, `description`,
   `purpose`, and a `format(data)` template.
2. Create `<name>Widget.tsx` — the UI; on send call
   `onSend({ type, data, text: spec.format(data) })`.
3. Add one line to `WIDGETS` in `registry.ts`.

Nothing in `ChatView` or the server needs to change — both are generic over the
registry and the `WidgetOutput` shape.

## Reference: widgets built so far

### Pros & Cons (`/pc`, `/procon`, `/proscons`, `/pros-cons`)

- **Purpose:** weigh a single option by laying upsides against downsides — good
  for go/no-go calls.
- **Structured:** `{ title, items: [{ text, pro, con }] }`
- **Plain text:**

  ```
  **Pros & Cons — <title>**

  Pros (1):
  - one

  Cons (1):
  - two
  ```

### Eisenhower matrix (`/eis`, `/eisenhower`, `/em`, `/matrix`)

- **Purpose:** prioritise tasks by importance and urgency to decide what to do
  next — do now, schedule, delegate, or drop.
- **Interaction:** tasks start in a pool at the bottom; drag each into one of the
  four important/urgent quadrants, then send.
- **Structured:** `{ title, entries: [{ text, important: 0|1, urgent: 0|1 }] }`
- **Plain text:**

  ```
  Here is a list of tasks
  Important but not urgent tasks: Pay taxes
  Urgent but not important tasks: Respond to Slack messages
  ```
