# chat to widget

there are features where we want to be able to update the widget from chat

this should also work within the MCP APP.
eg if the user wants to 'change the axes' being used for a comparison

They should be able to do this via the chat, but then it should actually update the widget to reflect the changes that they asked for.

To support this, we might need a live connection from the widget using sockets, for example, to a durable worker or some other Cloudflare construct, such as the agents SDK that can share state.

It might be impossible to do this via an MCP app, because we might not be able to have a socketed connection to our own application when going through the OpenAI MCP Apps infrastructure to display the widget to the end user.

---

## Plan

### Goal

Let a user **modify a widget already on screen by talking to the chat** —
e.g. with a 2×2 comparison open, typing *"change the axes to cost vs time"* or
*"add an electric scooter option"* re-renders that same widget with the new
axes/items, instead of dropping a brand-new widget or just replying in text.

### Key reframe: no socket is needed (for v1)

The todo worries about needing a **live socket / Durable Object** to push
updates into the widget — and that this might be impossible inside OpenAI's MCP
Apps sandbox. After reviewing both surfaces, **a socket isn't required for
either**; an update is just a request/response round-trip:

- **Native `/chat`** is plain React with all state in `ChatView.items` (no
  persistence, no realtime today — see `add-context.md`). An update is: send the
  message + the on-screen widget's id/state → router returns an *update
  directive* → `ChatView` re-renders that one widget item with new prefill. No
  socket, no DO.
- **OpenAI MCP Apps** is *also* request/response: the component renders inside a
  sandboxed iframe and talks to the host only through the `window.openai` bridge
  (`toolOutput`, `setWidgetState`, `callTool`, `sendFollowUpMessage`). "Change
  the axes" → the model re-invokes the tool with new params → the host re-renders
  the component from the new tool output. You *cannot* (and need not) open a
  back-socket from that iframe to our Worker for live push.

So **Durable Objects / Cloudflare Agents SDK / websockets are out of scope for
v1.** They only become necessary for *multiplayer / cross-device live sync*
(see `docs/plan/multiplayer.md`), which is a separate concern. Build the
request/response version first; it covers the stated use case.

### What already exists (reviewed)

- **Widget flow is one-directional today.** A widget is created once with
  `init` prefill (`ChatView.tsx` ~L413 slash, ~L155 routed), owns its local
  state, and on Send posts a `WidgetOutput` back; the server replies with a
  recommendation. Nothing ever pushes new state *into* a mounted widget.
- **Widgets read `initial` only on mount.** e.g. `TwoByTwoWidget.tsx` seeds from
  `initial.items/title/question` and calls `axes.suggest` once. Changing
  `initial` later has no effect — there's no re-sync.
- **The axes server endpoints already do the hard part** (`src/trpc/routers/axes.ts`):
  `suggest` (derive 2 axes), `options` (5 candidate dimensions), `score`
  (re-score on chosen axes), `generate` (new options + scores). So
  "change the axes to X vs Y" only needs to *route* to `axes.score` and feed the
  result back in — the compute exists.
- **The convo router** (`src/trpc/routers/chat.ts`, `RouteResult` ~L50) returns
  `{ reply, widget, title, items }` and already takes optional `widget`/`history`/
  `sessionId` inputs. It currently has no notion of an *existing on-screen*
  widget to target.
- **No MCP server / OpenAI App code exists** — no `@modelcontextprotocol`, no
  `window.openai`, no DO/websocket bindings in `wrangler.jsonc`. Honcho + Neon +
  tRPC + OpenRouter only.

### Design — native `/chat` (Phase 1, the real deliverable)

**1. Tell the router what's on screen.** `ChatView` already tracks `items`.
Extend the `chat.route` input with the currently-active widget(s):

```ts
// src/trpc/routers/chat.ts — route input
activeWidgets: z.array(z.object({
  id: z.string(),
  type: z.string(),
  data: z.unknown(),   // the widget's current structured state
})).optional(),
```

`ChatView` keeps the live `data` for each widget item (lift the last
`onSend`/edit payload into the item, or have widgets report state via a new
lightweight `onChange`; simplest v1 = send the most-recently-rendered widget and
its `init`/last-sent data).

**2. Router decides: new / update / chat.** Extend `RouteResult`:

```ts
export interface RouteResult {
  reply: string;
  widget: string | null;          // new widget to surface (unchanged)
  title: string | null;
  items: string[];
  update?: {                      // NEW: mutate an on-screen widget instead
    targetId: string;            // which active widget
    type: string;                // its type (sanity check)
    patch: unknown;              // widget-specific prefill/state delta
  } | null;
}
```

Update the routing prompt/schema (`RouteReplySchema` ~L27) so that when the
message clearly modifies a listed `activeWidget`, the LLM returns `update`
(with `targetId` + a typed `patch`) rather than a fresh `widget`. Heuristic
fallback in `convoRouter.ts` for the no-key path (keyword match like
"change/swap/use … axes/option").

**3. Apply the update in `ChatView`.** On `res.update`, find the item by
`targetId`, merge `patch` into its `init`, and **bump a `rev` counter** on the
item. Render the widget with `key={`${it.id}:${it.rev}`}` so it remounts with
the new prefill. Remount is the least-invasive option and keeps the widget
contract generic (CLAUDE.md: "adding a widget never edits ChatView"). For axes,
remount is fine because changing axes re-scores anyway.

**4. Widget contract change — minimal, generic.** Add one optional,
widget-interpreted field to `WidgetInit` (`client/components/widgets/types.ts`):

```ts
export interface WidgetInit {
  title?: string;
  items?: string[];
  question?: string;
  patch?: unknown;   // NEW: widget-specific overrides applied on (re)mount
}
```

`TwoByTwoWidget` honors `patch.axes = { x, y }`: if present, skip
`axes.suggest` and instead call `axes.score` with the requested axes (poles
auto-filled by the existing endpoint). Other widgets ignore `patch` until they
opt in — so this stays additive and generic.

This is the whole loop: **on-screen state → router → update directive → remount
with patch → re-scored widget.** No new transport.

### Design — OpenAI MCP Apps (Phase 3, larger, separate)

Only worth doing once the native loop works. This is a *new MCP server*, not a
change to the existing flow:

- Stand up an MCP server (likely a second Worker route or a `/mcp` Hono handler)
  that exposes each widget as a **tool** returning structured content plus a
  component resource tagged with `_meta["openai/outputTemplate"]` (the Apps SDK
  contract). The widget `.spec.ts` files are already pure/portable — reuse their
  `type`/`format`, render the `*Widget.tsx` into the iframe bundle.
- "Update from chat" inside ChatGPT = the model re-calls the tool with new args;
  the component reads the new `window.openai.toolOutput` and re-renders.
  Persist transient UI state with `window.openai.setWidgetState`; trigger a
  re-compute from inside the widget with `window.openai.callTool(...)`.
- **Confirms the todo's open question:** no back-socket to our app is possible
  *or needed* — the round-trip is the mechanism. Document this so the socket idea
  is laid to rest.

Use the `agents-sdk` / `durable-objects` skills only if we later add multiplayer
live sync; not for this feature.

### File-by-file (Phase 1)

| File | Change |
|---|---|
| `client/components/widgets/types.ts` | add `patch?: unknown` to `WidgetInit` |
| `src/trpc/routers/chat.ts` | `activeWidgets` input; `update` on `RouteResult` + schema; routing prompt update |
| `src/services/convoRouter.ts` | heuristic "update existing widget" fallback |
| `client/components/ChatView.tsx` | track per-widget current `data`; send `activeWidgets`; on `res.update` merge `patch` + bump `rev`; `key={id:rev}` on widget render |
| `client/components/widgets/TwoByTwoWidget.tsx` | honor `initial.patch.axes` → call `axes.score` instead of `suggest` |

Start with **2×2 / axes** as the single proof widget (it has the richest server
support and the clearest "change the axes" story); generalize `patch` to other
widgets afterward.

### Open questions / flags

- **State source of truth:** widgets own local state; the router needs *current*
  state, not stale `init`. v1: forward last-sent/last-rendered data for the
  active widget. Cleaner long-term: a lightweight `onChange(data)` on the widget
  contract — defer unless needed.
- **Remount vs in-place patch:** remount (via `key`) is simplest but discards
  unsent local edits (e.g. dragged positions). Acceptable for axes (re-score
  resets anyway); if a widget needs to preserve edits, give it an effect that
  re-syncs on `patch` change instead of remounting.
- **Targeting when multiple widgets are open:** send all `activeWidgets`; let the
  LLM pick `targetId`. Heuristic fallback targets the most-recent one.
- **Scope creep:** resist DO/websocket/Agents-SDK for v1 — request/response
  covers the use case. Revisit only for multiplayer (`multiplayer.md`).

### Phased delivery

1. **Plumbing:** `WidgetInit.patch`; `chat.route` `activeWidgets` input +
   `RouteResult.update`; heuristic fallback. `pnpm run typecheck`.
2. **Native loop (2×2):** `ChatView` sends active widget + applies update;
   `TwoByTwoWidget` honors `patch.axes` via `axes.score`. Verify in
   `pnpm run dev`: open `/22`, type "change the axes to cost vs time", confirm
   the same widget re-renders re-scored. `pnpm run build:client`.
3. **Generalize:** extend `patch` handling to 1–2 more widgets (e.g. add/remove
   items) and broaden the routing prompt.
4. **MCP Apps (separate effort):** stand up the MCP server exposing widgets as
   tools; map "update from chat" to tool re-invocation. Confirms no socket
   needed.

### Verification

- `pnpm run typecheck` after server/types changes; `pnpm run build:client` after
  `ChatView`.
- Manual (`pnpm run dev`, `/chat`): surface a 2×2, then drive it from chat
  ("change axes", "add option X") and confirm the *same* widget instance updates.
- Degrades without `OPENROUTER_API_KEY`: the heuristic fallback should still
  catch obvious "change the axes" phrasings; otherwise it replies in text (no
  crash).


