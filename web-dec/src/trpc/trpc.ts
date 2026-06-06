import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

// superjson keeps Date/Map/Set intact over the wire, so server `Date` columns
// stay `Date` on the client (must match the client link transformer).
const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
