import { router } from "./trpc";
import { boardRouter } from "./routers/board";
import { nodeRouter } from "./routers/node";
import { edgeRouter } from "./routers/edge";
import { messageRouter } from "./routers/message";
import { conceptRouter } from "./routers/concept";
import { chatRouter } from "./routers/chat";
import { readinessRouter } from "./routers/readiness";
import { suggestRouter } from "./routers/suggest";
import { treeRouter } from "./routers/tree";
import { premortemRouter } from "./routers/premortem";
import { scenarioRouter } from "./routers/scenario";

export const appRouter = router({
  board: boardRouter,
  node: nodeRouter,
  edge: edgeRouter,
  message: messageRouter,
  concept: conceptRouter,
  chat: chatRouter,
  readiness: readinessRouter,
  suggest: suggestRouter,
  tree: treeRouter,
  premortem: premortemRouter,
  scenario: scenarioRouter,
});

export type AppRouter = typeof appRouter;
