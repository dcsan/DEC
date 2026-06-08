// Static Better Auth instance for the Better Auth CLI (schema generation) only.
// The Worker never imports this — it builds the instance per-request from c.env
// via createAuth() in ./index.ts. Run via `pnpm auth:generate`.
import { createAuth } from "./index";

// This file runs only under Node (the Better Auth CLI), not in the Worker, so
// `process` is available at runtime. Declare it locally to avoid pulling Node
// types into the Worker's tsconfig.
declare const process: { env: Record<string, string | undefined> };

export const auth = createAuth({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
});
