import { defineConfig } from "drizzle-kit";

// Used by `just db-studio-local` to point Drizzle Studio at the local D1
// SQLite file that miniflare keeps under .wrangler/state/. The default
// drizzle.config.ts stays credential-free so `db:generate` works without
// resolving a DB path.
//
// Required env (set by the just recipe):
//   LOCAL_D1_PATH — absolute path to the .sqlite file
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.LOCAL_D1_PATH!,
  },
});
