import { router } from "./trpc";
import { boardRouter } from "./routers/board";
import { nodeRouter } from "./routers/node";
import { edgeRouter } from "./routers/edge";
import { messageRouter } from "./routers/message";
import { conceptRouter } from "./routers/concept";
import { chatRouter } from "./routers/chat";

export const appRouter = router({
  board: boardRouter,
  node: nodeRouter,
  edge: edgeRouter,
  message: messageRouter,
  concept: conceptRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
