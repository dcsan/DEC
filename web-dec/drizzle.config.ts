import { defineConfig } from "drizzle-kit";

// Drizzle is the single source of truth (src/db/schema.ts). `pnpm db:generate`
// diffs the schema into SQL under ./drizzle; `pnpm db:migrate` applies those to
// the Neon Postgres database at DATABASE_URL.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
