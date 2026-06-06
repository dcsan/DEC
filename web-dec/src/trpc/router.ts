import { router } from "./trpc";
import { boardRouter } from "./routers/board";
import { nodeRouter } from "./routers/node";
import { edgeRouter } from "./routers/edge";
import { messageRouter } from "./routers/message";
import { conceptRouter } from "./routers/concept";
import { chatRouter } from "./routers/chat";
import { optionsRouter } from "./routers/options";

export const appRouter = router({
  board: boardRouter,
  node: nodeRouter,
  edge: edgeRouter,
  message: messageRouter,
  concept: conceptRouter,
  chat: chatRouter,
  options: optionsRouter,
});

export type AppRouter = typeof appRouter;
