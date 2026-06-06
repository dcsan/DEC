import { router } from "./trpc";
import { boardRouter } from "./routers/board";
import { nodeRouter } from "./routers/node";
import { edgeRouter } from "./routers/edge";
import { messageRouter } from "./routers/message";
import { conceptRouter } from "./routers/concept";

export const appRouter = router({
  board: boardRouter,
  node: nodeRouter,
  edge: edgeRouter,
  message: messageRouter,
  concept: conceptRouter,
});

export type AppRouter = typeof appRouter;
