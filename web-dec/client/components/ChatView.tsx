// Standalone chat view. A plain message stream with the composer pinned to the
// bottom. Typing a widget slash command (e.g. `/pc`) drops that widget inline.
// A free-text message goes to the server's convo router: if it's a decision, the
// router chooses the most relevant widget and extracts the choices to prefill it
// — both returned and rendered here. Otherwise it's interpreted in context.

import { useEffect, useRef, useState } from "react";
import { trpc } from "../lib/trpc";
import {
  getWidget,
  isHelpCommand,
  matchExampleCommand,
  matchWidgetCommand,
  widgetExampleText,
  widgetHelpText,
} from "./widgets/registry";
import type { WidgetInit, WidgetOutput } from "./widgets/types";

type ChatItem =
  // A text message — from the user, a widget, or the assistant (server reply).
  | { kind: "message"; id: string; role: "user" | "widget" | "assistant"; content: string }
  // An inline interactive widget instance, optionally prefilled by the router.
  | { kind: "widget"; id: string; type: string; init?: WidgetInit };

const uid = () => crypto.randomUUID();

export function ChatView() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const send = trpc.chat.send.useMutation();

  // Keep the latest item in view as the stream grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  const append = (item: ChatItem) => setItems((cur) => [...cur, item]);

  // Build the chat history (text messages only) for server-side interpretation,
  // optionally with one not-yet-committed message appended.
  const toHistory = (extra?: { role: "user" | "assistant"; content: string }) => [
    ...items
      .filter((it): it is Extract<ChatItem, { kind: "message" }> => it.kind === "message")
      .map((it) => ({
        role: it.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: it.content,
      })),
    ...(extra ? [extra] : []),
  ];

  // Send a widget result to the server along with the original question that
  // surfaced it, so the server can recommend a decision with full context (not
  // just the widget's formatted output). Show the recommendation as a reply.
  const postWidgetResult = async (output: WidgetOutput, question?: string) => {
    const res = await send.mutateAsync({
      text: output.text,
      widget: { type: output.type, data: output.data },
      question: question || undefined,
    });
    append({ kind: "message", id: uid(), role: "assistant", content: res.reply });
  };

  // Route a free-text message: show the reply, and if the router chose a widget,
  // drop it into the stream prefilled with the extracted choices.
  const routeMessage = async (content: string) => {
    const res = await send.mutateAsync({
      text: content,
      history: toHistory({ role: "user", content }),
    });
    append({ kind: "message", id: uid(), role: "assistant", content: res.reply });
    if (res.widget && getWidget(res.widget)) {
      append({
        kind: "widget",
        id: uid(),
        type: res.widget,
        // Carry the original message so it's forwarded back on the final post.
        init: { title: res.title ?? undefined, items: res.items, question: content },
      });
    }
  };

  const submit = () => {
    const content = draft.trim();
    if (!content || send.isPending) return;

    // `/help` → list all widget shortcuts locally (no server round-trip).
    if (isHelpCommand(content)) {
      append({ kind: "message", id: uid(), role: "assistant", content: widgetHelpText() });
      setDraft("");
      return;
    }

    // `/ex` → example prompts. Bare `/ex` lists one example per widget; `/ex
    // <widget>` (e.g. `/ex eis`) sends that widget's example decision through the
    // router exactly as if the user typed it — so they get a real LLM answer and
    // the surfaced widget, prefilled.
    const ex = matchExampleCommand(content);
    if (ex) {
      setDraft("");
      if (ex.kind === "list") {
        append({ kind: "message", id: uid(), role: "assistant", content: widgetExampleText() });
      } else {
        append({ kind: "message", id: uid(), role: "user", content: ex.example });
        void routeMessage(ex.example);
      }
      return;
    }

    // Explicit slash command → drop the matching widget into the stream,
    // carrying any trailing args as the original question (e.g. `/eis taxes vs
    // twitter` → question "taxes vs twitter") for the final recommendation.
    const match = matchWidgetCommand(content);
    if (match) {
      append({
        kind: "widget",
        id: uid(),
        type: match.entry.spec.type,
        init: match.args ? { question: match.args } : undefined,
      });
      setDraft("");
      return;
    }

    // Free text → echo it, then let the server's convo router decide.
    append({ kind: "message", id: uid(), role: "user", content });
    setDraft("");
    void routeMessage(content);
  };

  const removeItem = (id: string) =>
    setItems((cur) => cur.filter((it) => it.id !== id));

  // A widget sending its result posts to the server (structured + text). The
  // widget itself stays in place, so we only show the server's reply — no
  // duplicate echo of the widget output.
  const sendFromWidget = (widgetId: string, output: WidgetOutput) => {
    const item = items.find((it) => it.id === widgetId);
    const question = item?.kind === "widget" ? item.init?.question : undefined;
    void postWidgetResult(output, question);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Message stream */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
          {items.length === 0 && (
            <p style={{ color: "var(--dec-text-subtle)", fontSize: 14, marginTop: 24 }}>
              Describe a decision (e.g. "should I join a startup?") and I'll
              surface a tool to help — or use a slash widget directly:{" "}
              <code>/rc</code> decision factors, <code>/eis</code> Eisenhower,{" "}
              <code>/swot</code>, <code>/sc</code> scenarios, <code>/dm</code>{" "}
              decision matrix, <code>/22</code>, <code>/cb</code> cost–benefit,{" "}
              <code>/pm</code> pre-mortem, <code>/dt</code> decision tree,{" "}
              <code>/ev</code> expected value, <code>/ooda</code>, <code>/rg</code>{" "}
              regret. Type <code>/help</code> for the full list.
            </p>
          )}

          {items.map((it) => {
            if (it.kind === "message") {
              return <MessageBubble key={it.id} role={it.role} content={it.content} />;
            }
            const entry = getWidget(it.type);
            if (!entry) return null;
            const Widget = entry.component;
            return (
              <div key={it.id} style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                <Widget
                  initial={it.init}
                  onSend={(output) => sendFromWidget(it.id, output)}
                  onRemove={() => removeItem(it.id)}
                />
              </div>
            );
          })}
          {send.isPending && <MessageBubble role="assistant" content="…" />}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer pinned to the bottom */}
      <div style={{ borderTop: "1px solid var(--dec-border-soft)", background: "var(--dec-surface)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: 12, display: "flex", gap: 8 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Message, /help, or /rc /eis /swot /sc /dm /22 /cb /pm /dt /ev /ooda /rg"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              padding: "10px 12px",
              fontSize: 14,
              borderRadius: 10,
              border: "1px solid var(--dec-border)",
              background: "var(--dec-surface-2)",
              color: "var(--dec-text)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            style={{
              padding: "0 18px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              background: draft.trim() ? "var(--dec-accent)" : "var(--dec-border)",
              color: draft.trim() ? "#0f1115" : "var(--dec-text-subtle)",
              cursor: draft.trim() ? "pointer" : "not-allowed",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: "user" | "widget" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "9px 12px",
          borderRadius: 12,
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          background: isUser ? "var(--dec-accent-soft)" : "var(--dec-surface-2)",
          color: "var(--dec-text)",
          border: "1px solid var(--dec-border-soft)",
        }}
      >
        {content}
      </div>
    </div>
  );
}
