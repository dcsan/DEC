import { defineConfig } from "drizzle-kit";

// Used by `just db-studio-remote` to point Drizzle Studio at the live D1.
// The default drizzle.config.ts stays credential-free so `db:generate` works
// without Cloudflare API access.
//
// Required env (load from .dev.vars):
//   CLOUDFLARE_ACCOUNT_ID    — dashboard URL or `wrangler whoami`
//   CLOUDFLARE_DATABASE_ID   — same id as wrangler.jsonc d1_databases[0].database_id
//   CLOUDFLARE_D1_TOKEN      — API token with the D1:Edit scope
//                              (create at https://dash.cloudflare.com/profile/api-tokens)
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
