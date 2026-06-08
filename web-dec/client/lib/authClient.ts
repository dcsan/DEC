// Better Auth client for the SPA. Talks to the Worker's /api/auth/* endpoints
// (same origin), used by the /sign-in page during the ChatGPT Connect flow and
// later for the web-app login. See src/auth/index.ts for the server.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
