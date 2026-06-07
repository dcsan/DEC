context

add a new command /context

this should show a new button 'Upload Documents (markdown)'

This should allow you to drop a document into the chat

review how we could add this to honcho as context for the session
this is like a 'batch upload'

so we can retrieve it

https://honcho.dev/docs/v3/documentation/features/get-context

for now just accept a text file, no file conversions

---

## Plan

### Goal

An **"Add context"** affordance in the `/chat` view that lets the user attach a
plain-text document to the current chat. The document is stored in **Honcho** as
session context (a "batch upload" via `session.uploadFile`), so later turns —
the convo router, the recommendation, and especially `/research` — can retrieve
it with Honcho's get-context API and reason over it.

Scope for v1: **text only** (`.txt`/`.md`/`text/*`), read in the browser with
`File.text()`, no file conversion, no PDF/docx parsing.

### What already exists (reviewed)

- **Honcho SDK is already a dependency** — `@honcho-ai/sdk@^2.1.2`. It's pure
  `fetch`/ESM (no Node built-ins) and uses `FormData`/`Blob`, so it runs inside
  the Cloudflare Worker as-is. No new install.
- **`HONCHO_API_KEY` is in `web-dec/.dev.vars`** but is **not** in the Worker's
  `Bindings` (`src/env.ts`) — today the key is only used by the Honcho **MCP
  server** (a dev-time tool for Claude Code), not by the app. The app has never
  talked to Honcho; the `default` workspace is currently empty (0 sessions).
- **The chat view has no session/persistence today.** `ChatView` keeps
  everything in local React state (`items`); nothing is written to D1 or Honcho.
  So this feature introduces the *first* server-side chat-session identity.
- **The SDK gives us exactly the three calls we need:**
  - `new Honcho({ apiKey, workspaceId })` → `honcho.session(id)`, `honcho.peer(id)`
  - `session.uploadFile(file, peer, { metadata })` — uploads a document; Honcho
    processes it into one or more messages. This *is* the "batch upload". From
    the Worker we pass `{ filename, content: Uint8Array, content_type: "text/plain" }`.
  - `session.addMessages([peer.message(text, { metadata })])` — simpler
    alternative that stores the doc as a single tagged message.
  - `session.context({ tokens, summary })` — the get-context retrieval
    (returns a summary blend + recent messages; has `.toAnthropic()` /
    `.toOpenAI()` helpers, plus `searchQuery` for semantic filtering).

### Honcho data model mapping

| Honcho concept | DEC mapping                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **workspace**  | one constant, e.g. `"dec"` (add `HONCHO_WORKSPACE` to `src/config.ts`)                                                                          |
| **session**    | one per chat. `ChatView` mints a `sessionId` (`crypto.randomUUID()`) on mount and sends it with every request.                                  |
| **peer**       | a stable `"user"` peer for the human. The uploaded doc is authored by the user peer (or a dedicated `"document"` peer) and tagged via metadata. |
| **message**    | the document content, tagged `metadata: { kind: "context", filename }` so it's distinguishable from chat turns.                                 |

Single-user local app → a fixed peer id (`"user"`) is fine for v1; revisit if we
add real auth.

### Decision: `uploadFile` vs `addMessages`

The spec calls it a "batch upload", which matches **`session.uploadFile`** —
Honcho ingests the document and chunks it into messages server-side, which is
better for longer docs and is the closer semantic fit. Recommend `uploadFile`
for v1, with `addMessages` as the trivial fallback if the upload endpoint gives
us trouble in the Worker (FormData edge cases).

### File-by-file changes

**Server**

1. `src/env.ts` + `worker-configuration.d.ts` — add `HONCHO_API_KEY?: string`
   to `Bindings`. Optional, like `OPENROUTER_API_KEY`: the app degrades
   gracefully without it.
2. `src/config.ts` — add `export const HONCHO_WORKSPACE = "dec";`.
3. `src/services/honcho.ts` *(new)* — thin factory mirroring the
   `openrouter.ts` convention (**no env reads in the lib**; caller passes the
   key): `makeHoncho(apiKey: string)` → `new Honcho({ apiKey, workspaceId: HONCHO_WORKSPACE })`.
   Keep it the single Honcho entry point.
4. `src/trpc/routers/context.ts` *(new)* — mount as `context` in
   `src/trpc/router.ts`:
   - `add({ sessionId, filename, text })` → get/create the `"user"` peer +
     `sessionId` session, call `session.uploadFile({ filename, content:
     new TextEncoder().encode(text), content_type: "text/plain" }, "user",
     { metadata: { kind: "context", filename } })`. Returns `{ ok, chars }`.
     No key → `TRPCError PRECONDITION_FAILED` (same pattern as `axes.ts`).
   - `get({ sessionId, tokens? })` → `session.context({ tokens, summary: true })`,
     return the formatted text. Used for retrieval/verification and by research.
   - Wrap Honcho calls in try/catch → `INTERNAL_SERVER_ERROR`, log with a
     `[context]` tag (matches existing router logging).

**Client**

5. `client/components/ChatView.tsx`:
   - Mint `sessionId` once: `useRef(crypto.randomUUID())` (or lazy `useState`).
   - Add an **"Add context"** button in the composer row (left of Send). It
     triggers a hidden `<input type="file" accept=".txt,.md,text/plain">`.
     Also wire **drag-and-drop** onto the message stream (the spec says "drop a
     document into the chat") — a drop handler reading `e.dataTransfer.files[0]`.
   - On select/drop: guard the MIME/extension (text only; reject others with an
     assistant note), `const text = await file.text()`, then
     `contextAdd.mutateAsync({ sessionId, filename, text })`.
   - Append a chat item showing `📄 Added context: <filename> (<n> chars)` and an
     error bubble on failure. Reuse the existing `message` item kind (maybe a
     `role: "assistant"` system-style line) — no new widget needed.
   - Gate submit while the upload is pending (like `send.isPending`).
6. Hint/affordance copy: mention "Add context" in the empty-state paragraph and
   the `/help` text.

### Retrieval tie-in (why we store it)

- **`/research`** (already built in `src/trpc/routers/research.ts`): before the
  web call, fetch `session.context({ sessionId })` and prepend it to the
  research prompt so deep advice is grounded in the uploaded document. This is
  the most valuable consumer and a clean demonstration of get-context.
- **Convo router / recommendation** (`chat.ts`): optionally inject session
  context too. Out of scope for v1 but the `context.get` endpoint makes it a
  one-liner later.
- Optionally also record chat turns into the same Honcho session (mirror each
  user/assistant message via `addMessages`) so get-context returns the *full*
  picture, not just the doc. **Follow-on**, not v1.

### Open questions / flags

- **Worker `uploadFile`**: verify `FormData` + `Blob` upload works against
  `mcp.honcho.dev`'s REST API from `wrangler dev`. If it's flaky, fall back to
  `addMessages` (single tagged message) — same retrieval story.
- **Peer identity**: fixed `"user"` for now; needs per-user ids if/when auth
  lands.
- **Size cap**: enforce a max text length (e.g. 200 KB) on both client and the
  tRPC input (`z.string().max(...)`) to avoid huge uploads.
- **Production secret**: `HONCHO_API_KEY` must be added via
  `wrangler secret put HONCHO_API_KEY` for deploys (it's only in `.dev.vars`
  locally today).
- **Workspace naming**: `"dec"` vs the SDK default `"default"` — pick `"dec"` so
  app data is isolated from any MCP/dev experiments.

### Phased delivery

1. **Plumbing**: env binding + `config` constant + `src/services/honcho.ts` +
   `context.add` endpoint. Typecheck.
2. **Client**: "Add context" button + file read + upload + chat acknowledgement.
   `pnpm run build:client`.
3. **Retrieve**: `context.get` + wire into `/research`. Manual verify in
   `pnpm run dev`: upload a `.txt`, run `/research`, confirm advice references
   the document.
4. **Follow-on (optional)**: drag-and-drop polish, mirror chat turns into the
   session, inject context into the convo router.

### Verification

- `pnpm run typecheck` after server changes; `pnpm run build:client` after
  `ChatView`.
- Manual: with `HONCHO_API_KEY` set, upload a text file, then use the Honcho MCP
  tools (`list_sessions` / `get_session_context` on workspace `dec`) to confirm
  the document landed and is retrievable. Without the key, the button should
  degrade gracefully (clear "needs Honcho" message), matching the key-less
  philosophy in CLAUDE.md.
