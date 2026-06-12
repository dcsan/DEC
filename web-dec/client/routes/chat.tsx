import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "../components/ChatView";

// `/chat?q=…` lets the landing page (or any link) open the chat with a question
// pre-asked: ChatView submits `q` once on mount, so it shows as the user's
// message and the router generates a reply.
//
// `/chat?s=…` is a shared-session link (the ☰ → Share button): ChatView adopts
// that session id and replays its logged conversation from the database.
export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): { q?: string; s?: string } => {
    const q = typeof search.q === "string" ? search.q.trim() : "";
    const s = typeof search.s === "string" ? search.s.trim() : "";
    return { ...(q ? { q } : {}), ...(s ? { s } : {}) };
  },
  component: ChatRoute,
});

function ChatRoute() {
  const { q, s } = Route.useSearch();
  return <ChatView initialPrompt={q} initialSessionId={s} />;
}
