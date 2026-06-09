import { router } from "./trpc";
import { boardRouter } from "./routers/board";
import { nodeRouter } from "./routers/node";
import { edgeRouter } from "./routers/edge";
import { messageRouter } from "./routers/message";
import { conceptRouter } from "./routers/concept";
import { chatRouter } from "./routers/chat";
import { researchRouter } from "./routers/research";
import { vizRouter } from "./routers/viz";
import { factsRouter } from "./routers/facts";
import { summaryRouter } from "./routers/summary";
import { contextRouter } from "./routers/context";
import { factorsRouter } from "./routers/factors";
import { axesRouter } from "./routers/axes";
import { suggestRouter } from "./routers/suggest";
import { treeRouter } from "./routers/tree";
import { premortemRouter } from "./routers/premortem";
import { scenarioRouter } from "./routers/scenario";
import { swotRouter } from "./routers/swot";
import { eisenhowerRouter } from "./routers/eisenhower";
import { waitlistRouter } from "./routers/waitlist";

export const appRouter = router({
  board: boardRouter,
  node: nodeRouter,
  edge: edgeRouter,
  message: messageRouter,
  concept: conceptRouter,
  chat: chatRouter,
  research: researchRouter,
  viz: vizRouter,
  facts: factsRouter,
  summary: summaryRouter,
  context: contextRouter,
  factors: factorsRouter,
  axes: axesRouter,
  suggest: suggestRouter,
  tree: treeRouter,
  premortem: premortemRouter,
  scenario: scenarioRouter,
  swot: swotRouter,
  eisenhower: eisenhowerRouter,
  waitlist: waitlistRouter,
});

export type AppRouter = typeof appRouter;
