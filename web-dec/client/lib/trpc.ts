import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../src/trpc/router";

// Typed tRPC React hooks. The AppRouter type is imported across the
// client/server boundary (tsconfig includes both src and client) so calls
// are fully type-checked end-to-end.
export const trpc = createTRPCReact<AppRouter>();
