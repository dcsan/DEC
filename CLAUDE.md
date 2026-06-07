# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

- `web-dec/` — the entire application (Cloudflare Worker + React SPA). **All
  commands run from inside `web-dec/`.**
- `docs/plan/` — product/architecture specs (`overview.md`, `stack.md`,
  `widget-spec.md`, …).
- `docs/specs/` — feature briefs that get implemented (e.g.
  `Eisenhower-matrix.md`, `convo-router.md`). A task is often "do
  @docs/specs/<x>.md".

The package manager is **pnpm**, and common workflows are wrapped in a
`justfile` (`just` with no args lists every recipe).

## Commands (run in `web-dec/`)

| Command | What |
|---|---|
| `pnpm run typecheck` (`just lint`) | `tsc --noEmit` over **both** `src/` (server) and `client/` — one pass, shared tsconfig. Primary check after any change. |
| `pnpm run build:client` | Vite build. Also **regenerates `client/routeTree.gen.ts`** — run after adding/renaming a route. |
| `pnpm run build` (`just build`) | client build + `wrangler deploy --dry-run`; verifies the Worker bundles. |
| `pnpm run dev` (`just dev`) | client + Worker together. Client on **:6391**, Worker on **:6390** (uncommon ports on purpose; override with `PORT_CLIENT`/`PORT_SERVER`). |
| `just migrations-generate` | new Postgres migration from `src/db/schema.ts` diffs → `drizzle/`. |
| `just migrations-apply` | apply pending migrations to the Neon DB at `DATABASE_URL`. |
| `just db-studio` / `db-sql "SELECT …"` | inspect the Neon database. |
| `just logs-tail [--status error]` | stream production Worker logs. |

There is **no test suite**. Verify changes with `pnpm run typecheck` and, for
client/route changes, `pnpm run build:client`. To see behavior, `pnpm run dev`
and open `/chat`.

LLM features need `OPENROUTER_API_KEY` in `web-dec/.dev.vars`
(`cp .dev.vars.example .dev.vars`). Everything degrades gracefully without it
(deterministic fallbacks), so the app runs key-less.

## Architecture

Single **Cloudflare Worker** (`src/index.ts`, Hono) serves two things: the tRPC
API under `/trpc/*` and the built SPA (everything else falls back to
`index.html`). One **Neon Postgres** database, reached over the `DATABASE_URL`
secret via Drizzle + `@neondatabase/serverless` (`src/db/client.ts`).

**End-to-end typed tRPC is the backbone.** `client/lib/trpc.ts` imports the
`AppRouter` *type* from `src/trpc/router.ts` across the client/server boundary —
possible because one `tsconfig.json` includes both `src/**` and `client/**`.
superjson is the transformer on both ends (keeps `Date` intact over the wire).
Add a feature = add a sub-router in `src/trpc/routers/`, mount it in
`router.ts`, call it via the typed `trpc.*` hooks on the client.

**Database:** Drizzle ORM over **Neon Postgres**, `src/db/schema.ts` is the
single source of truth for tables *and* TS types (`$inferSelect`). Never
hand-write a migration — edit the schema, then `just migrations-generate`
(SQL → `drizzle/`) and `just migrations-apply`. `ctx.db` is created lazily from
`DATABASE_URL`, so chat-only requests don't need the DB.

**LLM access:** `src/services/llm/openrouter.ts` (`structuredChat`) is the only
LLM client. Every call is **schema-driven** — the caller passes a zod schema
(see `src/services/llm/schemas.ts`), which becomes the model's
`response_format` *and* validates the reply. No env reads inside the lib; the
caller passes `apiKey`, and each LLM-backed procedure has a no-key fallback.

### Two UIs

There are two distinct front-end surfaces; don't confuse them:

1. **Chat view (`/chat`)** — the current, active surface. A standalone chat
   stream with widgets. Plain React + local state, **no react-flow**. The home
   page (`/`) routes here.
2. **Board/canvas (`/b/$boardId`)** — the original react-flow canvas + chat
   sidebar, backed by `board`/`node`/`edge`/`message`/`concept` routers and D1.
   **Currently orphaned** — reachable only by direct URL, not linked from the
   home page. Leave it intact unless a task is about it.

### The widget + convo-router system (the chat view's core)

This is the part that spans the most files. A **widget** is a self-contained
interactive tool dropped into the chat by a slash command (`/pc`, `/eis`) or by
the router. Two pieces, deliberately split:

- `client/components/widgets/<name>.spec.ts` — **pure, no React**: `type`,
  `commands`, `title`, `description`, `purpose`, the `TData` interface(s), and
  `format(data)` (structured data → agent-readable plain text). The `purpose`
  field is what the router matches against.
- `client/components/widgets/<name>Widget.tsx` — the React UI; owns local
  state, accepts an optional `initial` prefill, and on Send calls
  `onSend({ type, data, text: spec.format(data) })` — **always both** the
  structured payload and the plain-text rendering (`WidgetOutput`).

**There are two registries that must stay in sync** (this trips people up):

- `client/components/widgets/registry.ts` — maps `type` → React component, for
  rendering + slash-command matching.
- `src/services/widgetRegistry.ts` — a plain `{ type, title, purpose }` table
  the **server LLM router reads** to choose a widget. If a widget is missing
  here, slash commands still work but the router can never surface it from
  natural language.

**Convo router** (`src/trpc/routers/chat.ts`): for free-text messages it
classifies decision-vs-chat, and for decisions the LLM picks the best widget by
`purpose` from `WIDGET_REGISTRY` and extracts the choices, returning
`{ reply, widget, title, items }`. `ChatView` then drops that widget prefilled
via `initial`. Heuristic fallback lives in `src/services/convoRouter.ts` (used
when there's no API key). `ChatView` and the router stay generic over
`WidgetOutput` — adding a widget never edits them.

**Use the `widget-creator` skill** when adding/scaffolding a widget — it encodes
the two-file + two-registry + prefill conventions and the shared visual shell.

### Conventions worth matching

- Styling is **inline `style={{…}}` with `--dec-*` CSS variables**
  (`client/index.css`) — no Tailwind classes in components, no hardcoded hex
  (match the theme tokens).
- Routes are **file-based** (`@tanstack/router-plugin`); the route tree is
  generated, so add a file under `client/routes/` and rebuild rather than
  editing `routeTree.gen.ts`.
- `crypto.randomUUID()` for client-side ids is fine (browser/Worker runtime).
