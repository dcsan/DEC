# Widget contract, tokens & shared styles

Everything a new widget must conform to, in one place. Source of truth is
`web-dec/client/components/widgets/types.ts` (the contracts) and
`web-dec/client/index.css` (the tokens) — this file mirrors them for quick
reference. If they ever drift, the real files win.

## The contracts (`types.ts` — do not edit)

```ts
export interface WidgetSpec<TData = unknown> {
  type: string;          // stable id, matches the registry + chat items
  commands: string[];    // slash triggers, no leading slash; first is canonical
  title: string;         // human label
  description: string;   // one-line description for hints/menus
  purpose: string;       // what this widget is good for — its decision use
  format: (data: TData) => string;  // structured data -> plain-text rendering
}

export interface WidgetOutput<TData = unknown> {
  type: string;   // which widget produced it (== WidgetSpec.type)
  data: TData;    // structured payload — the raw data
  text: string;   // plain-text rendering, from spec.format(data)
}

// Generic prefill the router passes when it surfaces a widget from a decision.
export interface WidgetInit {
  title?: string;
  items?: string[];   // choices/tasks extracted from the conversation
}

export interface WidgetProps {
  initial?: WidgetInit;                     // router prefill (optional)
  onSend: (output: WidgetOutput) => void;  // send result back to chat
  onRemove: () => void;                     // remove this instance
}
```

The component assembles its output on send:

```ts
onSend({ type: spec.type, data, text: spec.format(data) });
```

And seeds its initial state from `initial` when present (see the component
template / `ProConWidget` for the pattern).

## Chat flow (why the contract is shaped this way)

1. User types `/<command>` → `ChatView` matches it via `matchWidgetCommand` and
   drops the widget inline into the stream.
2. User fills the widget and clicks **Send**.
3. The widget calls `onSend({ type, data, text })`.
4. `ChatView` posts `{ text, widget: { type, data } }` to the server
   (`trpc.chat.send`). The widget stays in place; only the server reply shows
   (no duplicate echo of the widget's own output).
5. The server logs the structured payload + text and returns a reply.

For free-text (non-slash) messages, `ChatView` instead calls the server's convo
router, which reads the **server-side registry** (`src/services/widgetRegistry.ts`)
to pick a widget by `purpose`, extracts the choices, and returns
`{ reply, widget, title, items }`. `ChatView` then drops that widget prefilled
via `initial`.

`ChatView` and the chat router stay generic over `WidgetOutput` — adding a widget
means: the two widget files, the client registry line, and the server registry
entry. Only the registries know the widget exists.

## Design tokens (`--vizithink-*`, defined in `client/index.css`)

Use these for **every** color. Never hardcode hex (the one exception in the
shipped code is `#0a0c12` as the on-accent text color — match it if you copy
the shell).

| Token | Value | Use |
|-------|-------|-----|
| `--vizithink-bg` | `#0a0c12` | page background, chart panels |
| `--vizithink-surface` | `#13161f` | header/footer, inputs, drop zones |
| `--vizithink-surface-2` | `#1a1e2a` | the widget card body |
| `--vizithink-border` | `#2c3242` | borders, inputs |
| `--vizithink-border-soft` | `#222736` | header/footer divider lines |
| `--vizithink-text` | `#edeff4` | primary text |
| `--vizithink-text-muted` | `#a9b0c2` | secondary buttons/labels |
| `--vizithink-text-subtle` | `#6e7588` | captions, axis labels, placeholders |
| `--vizithink-accent` | `#6ea8fe` | the Send button background |
| `--vizithink-accent-2` | `#9b8cff` | gradient partner for the accent |
| `--vizithink-accent-soft` | `#233252` | soft accent fills |
| `--vizithink-glow` | `rgba(110,168,254,.35)` | glow shadows |
| `--vizithink-option` | `#f0b86e` | tint (orange) — e.g. con checkbox |
| `--vizithink-concept` | `#6ea8fe` | tint (blue) — Eisenhower card border |
| `--vizithink-framework` | `#9b8cff` | tint (purple) — Pros & Cons card border |
| `--vizithink-merged` | `#5fd6a6` | tint (green) — "Sent ✓", pro checkbox |
| `--vizithink-bad` | `#ff8b8b` | tint (red) — remove buttons, bad outcomes |

Shared visual-effect classes also live in `client/index.css`: `vt-range`
(styled `<input type="range">` — use it instead of `accentColor`), `vt-card`
(hover lift), `vt-grad-text`, `vt-cta`, `vt-aurora`.

**Picking the card accent:** each widget uses one tint for its `ACCENT` (the
card border + header icon). Pros & Cons uses `--vizithink-framework`, Eisenhower uses
`--vizithink-concept`. Pick an unused/fitting tint for the new widget.

## The shared shell

Every widget is a bordered card with three regions. Copy this structure (it's in
both shipped widgets, verbatim apart from the body):

- **Card**: `maxWidth: 460`, `borderRadius: 12`, `background var(--vizithink-surface-2)`,
  `border: 1.5px solid ${ACCENT}`, `overflow: hidden`.
- **Header**: an icon glyph, an editable title `<input>` (transparent, changing
  it clears `sent`), and a `⨯` remove button (`onRemove`).
- **Body**: the widget-specific UI.
- **Footer**: right-aligned; shows "Sent ✓" when `sent`, then the Send button
  reading "Send to chat ↩" / "Send again ↩", disabled until there's content.

## Shared style objects

These are duplicated (intentionally, per-file) at the bottom of each widget.
Copy them into the new component:

```ts
const iconBtn: React.CSSProperties = {
  fontSize: 12, width: 20, height: 20, borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-bad)", cursor: "pointer", flexShrink: 0,
};

const sendBtn = (enabled: boolean): React.CSSProperties => ({
  fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
  border: "none",
  background: enabled ? "var(--vizithink-accent)" : "var(--vizithink-border)",
  color: enabled ? "#0a0c12" : "var(--vizithink-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
});

const rowInput: React.CSSProperties = {
  flex: 1, padding: "5px 7px", fontSize: 12, borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface)",
  color: "var(--vizithink-text)", outline: "none",
};
```

For drag-and-drop widgets, see `EisenhowerWidget.tsx`: native HTML5 DnD
(`draggable`, `onDragStart` setting `dataTransfer`, a `dropProps(zone)` factory
with `onDragOver`/`onDrop`) — no library.
