import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { trpc } from "./lib/trpc";
import { llmTraceLink } from "./lib/llmTrace";
import { LLM_TRACE_HEADER } from "../src/services/llm/traceTypes";
import { routeTree } from "./routeTree.gen";
import "@xyflow/react/dist/style.css";
import "./index.css";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        // Unwraps the LLM prompts/responses the server attaches to results
        // (requested via the header below) for the /chat 🧠 sidebar.
        llmTraceLink,
        httpBatchLink({
          url: "/trpc",
          transformer: superjson,
          headers: { [LLM_TRACE_HEADER]: "1" },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
