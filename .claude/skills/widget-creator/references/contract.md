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

export interface WidgetProps {
  onSend: (output: WidgetOutput) => void;  // send result back to chat
  onRemove: () => void;                     // remove this instance
}
```

The component assembles its output on send:

```ts
onSend({ type: spec.type, data, text: spec.format(data) });
```

## Chat flow (why the contract is shaped this way)

1. User types `/<command>` → `ChatView` matches it via `matchWidgetCommand` and
   drops the widget inline into the stream.
2. User fills the widget and clicks **Send**.
3. The widget calls `onSend({ type, data, text })`.
4. `ChatView` posts `{ text, widget: { type, data } }` to the server
   (`trpc.chat.send`). The widget stays in place; only the server reply shows
   (no duplicate echo of the widget's own output).
5. The server logs the structured payload + text and returns a reply.

Because both `ChatView` and the server are generic over `WidgetOutput`, adding a
widget never requires touching them — only the two widget files + the registry.

## Design tokens (`--dec-*`, defined in `client/index.css`)

Use these for **every** color. Never hardcode hex (the one exception in the
shipped code is `#ff8b8b` for the remove-button glyph and `#0f1115` as the
on-accent text color — match those if you copy the shell).

| Token | Value | Use |
|-------|-------|-----|
| `--dec-bg` | `#0f1115` | page background |
| `--dec-surface` | `#171a21` | header/footer, inputs, drop zones |
| `--dec-surface-2` | `#1e222b` | the widget card body |
| `--dec-border` | `#2a2f3a` | borders, inputs |
| `--dec-border-soft` | `#21262f` | header/footer divider lines |
| `--dec-text` | `#e8eaed` | primary text |
| `--dec-text-muted` | `#a7adba` | secondary buttons/labels |
| `--dec-text-subtle` | `#6b7280` | captions, axis labels, placeholders |
| `--dec-accent` | `#6ea8fe` | the Send button background |
| `--dec-accent-soft` | `#2b3a55` | soft accent fills |
| `--dec-option` | `#f0b86e` | tint (orange) — e.g. con checkbox |
| `--dec-concept` | `#6ea8fe` | tint (blue) — Eisenhower card border |
| `--dec-framework` | `#9b8cff` | tint (purple) — Pros & Cons card border |
| `--dec-merged` | `#5fd6a6` | tint (green) — "Sent ✓", pro checkbox |

**Picking the card accent:** each widget uses one tint for its `ACCENT` (the
card border + header icon). Pros & Cons uses `--dec-framework`, Eisenhower uses
`--dec-concept`. Pick an unused/fitting tint for the new widget.

## The shared shell

Every widget is a bordered card with three regions. Copy this structure (it's in
both shipped widgets, verbatim apart from the body):

- **Card**: `maxWidth: 460`, `borderRadius: 12`, `background var(--dec-surface-2)`,
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
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface-2)",
  color: "#ff8b8b", cursor: "pointer", flexShrink: 0,
};

const sendBtn = (enabled: boolean): React.CSSProperties => ({
  fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
  border: "none",
  background: enabled ? "var(--dec-accent)" : "var(--dec-border)",
  color: enabled ? "#0f1115" : "var(--dec-text-subtle)",
  cursor: enabled ? "pointer" : "not-allowed",
});

const rowInput: React.CSSProperties = {
  flex: 1, padding: "5px 7px", fontSize: 12, borderRadius: 6,
  border: "1px solid var(--dec-border)",
  background: "var(--dec-surface)",
  color: "var(--dec-text)", outline: "none",
};
```

For drag-and-drop widgets, see `EisenhowerWidget.tsx`: native HTML5 DnD
(`draggable`, `onDragStart` setting `dataTransfer`, a `dropProps(zone)` factory
with `onDragOver`/`onDrop`) — no library.
