import { router } from "./trpc";
import { boardRouter } from "./routers/board";
import { nodeRouter } from "./routers/node";
import { edgeRouter } from "./routers/edge";
import { messageRouter } from "./routers/message";
import { conceptRouter } from "./routers/concept";
import { chatRouter } from "./routers/chat";
import { researchRouter } from "./routers/research";
import { factorsRouter } from "./routers/factors";
import { axesRouter } from "./routers/axes";
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
  research: researchRouter,
  factors: factorsRouter,
  axes: axesRouter,
  suggest: suggestRouter,
  tree: treeRouter,
  premortem: premortemRouter,
  scenario: scenarioRouter,
});

export type AppRouter = typeof appRouter;
