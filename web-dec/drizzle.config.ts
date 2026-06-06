import { defineConfig } from "drizzle-kit";

// drizzle-kit only generates SQL files from schema diffs here. The actual
// migrations are applied via `wrangler d1 migrations apply`, which reads
// from migrations/ — see package.json db:migrate:* scripts.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});
