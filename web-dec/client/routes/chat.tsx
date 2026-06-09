import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "../components/ChatView";

// `/chat?q=…` lets the landing page (or any link) open the chat with a question
// pre-asked: ChatView submits `q` once on mount, so it shows as the user's
// message and the router generates a reply.
export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search.q === "string" ? search.q.trim() : "";
    return q ? { q } : {};
  },
  component: ChatRoute,
});

function ChatRoute() {
  const { q } = Route.useSearch();
  return <ChatView initialPrompt={q} />;
}
