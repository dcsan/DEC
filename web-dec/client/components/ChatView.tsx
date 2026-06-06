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
  matchResearchCommand,
  matchUseCommand,
  matchWidgetCommand,
  widgetExampleText,
  widgetHelpText,
} from "./widgets/registry";
import type { WidgetInit, WidgetOutput } from "./widgets/types";

type ChatItem =
  // A text message — from the user, a widget, or the assistant (server reply).
  | { kind: "message"; id: string; role: "user" | "widget" | "assistant"; content: string }
  // An inline interactive widget instance, optionally prefilled by the router.
  | { kind: "widget"; id: string; type: string; init?: WidgetInit }
  // A /research result: plain-text advice plus clickable web sources.
  | { kind: "research"; id: string; advice: string; sources: { title: string; url: string }[] };

const uid = () => crypto.randomUUID();

export function ChatView() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const send = trpc.chat.send.useMutation();
  const research = trpc.research.run.useMutation();

  // Keep the latest item in view as the stream grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  // Focus the composer when the chat page opens, so you can type right away.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  // The decision the user is currently working on: the most recent widget's
  // carried question, else the last user message. Used to seed /research when
  // the command is given without explicit args.
  const lastDecision = (): string | undefined => {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.kind === "widget" && it.init?.question?.trim()) return it.init.question.trim();
      if (it.kind === "message" && it.role === "user") return it.content;
    }
    return undefined;
  };

  // `/research [decision]` → run web-augmented deep research on the decision
  // (explicit args win, else the current decision) using the full chat history,
  // and append the sourced advice as an assistant message.
  const runResearch = async (args: string) => {
    const question = args.trim() || lastDecision();
    if (!question) {
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content:
          "Tell me what to research — describe a decision first, or run `/research <your decision>`.",
      });
      return;
    }
    append({ kind: "message", id: uid(), role: "user", content: `/research ${question}` });
    try {
      const res = await research.mutateAsync({ question, history: toHistory() });
      append({ kind: "research", id: uid(), advice: res.advice, sources: res.sources });
    } catch (err) {
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content: err instanceof Error ? err.message : "Research failed. Please try again.",
      });
    }
  };

  const submit = () => {
    const content = draft.trim();
    if (!content || send.isPending || research.isPending) return;

    // `/research [decision]` → web-augmented deeper advice (not a widget).
    const res = matchResearchCommand(content);
    if (res) {
      setDraft("");
      void runResearch(res.args);
      return;
    }

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

    // "use <widget> …" → force that widget, bypassing the router (e.g. "use sc
    // to plan what to do next"). Echo the message (it's natural language), then
    // drop the widget prefilled with the rest as the question.
    const use = matchUseCommand(content);
    if (use) {
      append({ kind: "message", id: uid(), role: "user", content });
      append({
        kind: "widget",
        id: uid(),
        type: use.entry.spec.type,
        init: use.args ? { question: use.args } : undefined,
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
              regret. Or <code>/research</code> for web-sourced deeper advice on
              your decision. Type <code>/help</code> for the full list.
            </p>
          )}

          {items.map((it) => {
            if (it.kind === "message") {
              return <MessageBubble key={it.id} role={it.role} content={it.content} />;
            }
            if (it.kind === "research") {
              return <ResearchBubble key={it.id} advice={it.advice} sources={it.sources} />;
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
          {(send.isPending || research.isPending) && (
            <MessageBubble role="assistant" content={research.isPending ? "Researching…" : "…"} />
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer pinned to the bottom */}
      <div style={{ borderTop: "1px solid var(--dec-border-soft)", background: "var(--dec-surface)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: 12, display: "flex", gap: 8 }}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Message, /help, /research, or /rc /eis /swot /sc /dm /22 /cb /pm /dt /ev /ooda /rg"
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

// A /research reply: the advice as a plain-text bubble (same shell as an
// assistant message) plus a sources list rendered as clickable links.
function ResearchBubble({
  advice,
  sources,
}: {
  advice: string;
  sources: { title: string; url: string }[];
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "85%",
          padding: "9px 12px",
          borderRadius: 12,
          fontSize: 14,
          lineHeight: 1.5,
          background: "var(--dec-surface-2)",
          color: "var(--dec-text)",
          border: "1px solid var(--dec-border-soft)",
        }}
      >
        <div style={{ whiteSpace: "pre-wrap" }}>{advice}</div>
        {sources.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--dec-border-soft)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dec-text-subtle)", marginBottom: 4 }}>
              Sources
            </div>
            {sources.map((s, i) => (
              <div key={i} style={{ fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: "var(--dec-text-subtle)" }}>• </span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--dec-accent)", textDecoration: "none" }}
                >
                  {s.title || s.url}
                </a>
              </div>
            ))}
          </div>
        )}
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
