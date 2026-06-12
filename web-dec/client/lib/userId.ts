// Temp user id (docs/todo/TempUserId.md): a per-browser anonymous id, created
// on first visit and kept in localStorage. Sent with every chat.send so
// chat_logs rows are tagged with it — that's what lets /admin/users group
// sessions by visitor. Distinct from the per-visit session id, which rotates
// every time the /chat view opens.

const KEY = "vizithink-user-id";

export function getTempUserId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private mode, blocked) — stay anonymous for
    // this page load rather than failing the chat.
    return "anon";
  }
}
