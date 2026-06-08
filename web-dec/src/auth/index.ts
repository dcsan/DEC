// Better Auth — the OAuth/OIDC authorization server for the ViziThink ChatGPT App
// (Phase 5c of docs/todo/Auth.md). Self-hosted on the Worker, backed by the same
// Neon Postgres DB. The `mcp` plugin makes this an OAuth provider for MCP clients
// (ChatGPT): it adds the OIDC provider + dynamic client registration + the
// /.well-known discovery the connect flow needs, and `withMcpAuth`/`getMcpSession`
// validate the bearer access token on /mcp.
//
// On the Workers runtime there is no env at module load, so the instance is built
// per-request from `c.env` via `createAuth(env)`. (The Better Auth CLI uses the
// static instance in ./cli.ts instead.)

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { mcp } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as authSchema from "../db/auth-schema";
import { consentHTML } from "./consent";

export interface AuthEnv {
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
}

export type Auth = ReturnType<typeof createAuth>;

export function createAuth(env: AuthEnv) {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Better Auth");
  }
  const db = drizzle(neon(env.DATABASE_URL), { schema: authSchema });

  return betterAuth({
    // Public origin → OAuth issuer + the base for discovery/redirect URLs. Must
    // match the host ChatGPT connects to (the tunnel / prod origin).
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    // First auth method: email + password. Google OAuth can be added later.
    emailAndPassword: { enabled: true },
    plugins: [
      // Turns this into an OAuth provider for MCP clients. `loginPage` is where
      // the user is sent to authenticate during the ChatGPT connect flow;
      // `resource` is the canonical MCP resource id advertised in the protected-
      // resource metadata and bound into issued tokens (RFC 8707 audience).
      mcp({
        loginPage: "/sign-in",
        resource: env.BETTER_AUTH_URL ? `${env.BETTER_AUTH_URL}/mcp` : undefined,
        // DCR clients (ChatGPT) aren't pre-trusted, so the authorize step needs a
        // consent screen. Render our own (server-side) instead of erroring.
        oidcConfig: {
          loginPage: "/sign-in",
          getConsentHTML: (args) => consentHTML(args),
        },
      }),
    ],
  });
}
