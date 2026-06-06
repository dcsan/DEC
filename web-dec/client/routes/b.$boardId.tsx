import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";
import { ChatSidebar } from "../components/ChatSidebar";
import { Canvas } from "../components/Canvas";

export const Route = createFileRoute("/b/$boardId")({
  component: BoardPage,
});

function BoardPage() {
  const { boardId } = Route.useParams();
  const board = trpc.board.get.useQuery({ id: boardId });

  if (board.isLoading) {
    return <Centered>Loading board…</Centered>;
  }
  if (!board.data) {
    return <Centered>Board not found.</Centered>;
  }

  const { nodes, edges, messages } = board.data;
  const refetch = () => board.refetch();

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      <ChatSidebar boardId={boardId} messages={messages} onChanged={refetch} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Canvas
          boardId={boardId}
          nodes={nodes}
          edges={edges}
          onChanged={refetch}
        />
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        color: "var(--dec-text-subtle)",
      }}
    >
      {children}
    </div>
  );
}
