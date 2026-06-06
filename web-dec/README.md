# web-dec

The DEC app — an AI decision helper. Chat through a decision in a sidebar while
mapping options, frameworks and ideas on an infinite [react-flow] canvas.

See [`../docs/plan/overview.md`](../docs/plan/overview.md) for the product spec
and [`../docs/plan/stack.md`](../docs/plan/stack.md) for the stack rationale.

## Stack

- **Cloudflare Workers** — single Worker serves the API and the built SPA
- **Hono + tRPC** — `Hono` is the HTTP entry; all procedures are mounted under
  `/trpc/*` and fully typed end-to-end via `AppRouter`
- **Drizzle ORM + Cloudflare D1** — SQLite at the edge
- **React 19 + TanStack Router/Query** — file-based routes in `client/routes`
- **@xyflow/react** (react-flow v12) — the canvas
- **OpenRouter** (optional) — powers concept search / expand / merge; the app
  runs without a key (those features fall back to deterministic stubs)

## Layout

```
src/                Worker + API
  index.ts          Hono app, tRPC mount, SPA fallback
  env.ts            Worker bindings
  db/               Drizzle schema + client
  lib/llm.ts        OpenRouter JSON wrapper (+ no-key fallback)
  trpc/
    router.ts       appRouter (board · node · edge · message · concept)
    routers/        one file per sub-router
client/             React SPA
  routes/           __root, / (board list), /b/$boardId (the app)
  components/       ChatSidebar, Canvas, ConceptSearch, nodes/ConceptNode
migrations/         D1 SQL migrations
```

## First-time setup

```sh
pnpm install

# 1. create the D1 database, then paste the returned id into
#    wrangler.jsonc → d1_databases[0].database_id
just db-create

# 2. apply migrations to the local D1
just migrations-local

# 3. (optional) enable the LLM features
cp .dev.vars.example .dev.vars   # then fill in OPENROUTER_API_KEY

# 4. run client + worker together
just dev
```

The client runs on http://localhost:6391 and proxies `/trpc` + `/api` to the
Worker on :6390 (inspector on :9390). These are deliberately uncommon ports to
avoid colliding with other local dev apps; override per-run with `PORT_CLIENT`
/ `PORT_SERVER`.

## Deploy

```sh
just migrations-remote   # if the schema changed
just deploy
```

## Common tasks

`just` with no args lists every recipe. Highlights:

| recipe | what |
|---|---|
| `just dev` | run client + worker |
| `just migrations-generate` | new migration from schema diffs |
| `just migrations-local` / `migrations-remote` | apply migrations |
| `just db-studio-local` | Drizzle Studio on the local D1 |
| `just db-sql-local "SELECT …"` | ad-hoc SQL |
| `just logs-tail` | stream production Worker logs |

[react-flow]: https://reactflow.dev
