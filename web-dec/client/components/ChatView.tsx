// Standalone chat view. A plain message stream with the composer pinned to the
// bottom. Typing a widget slash command (e.g. `/pc`) drops that widget inline.
// A free-text message goes to the server's convo router: if it's a decision, the
// router chooses the most relevant widget and extracts the choices to prefill it
// — both returned and rendered here. Otherwise it's interpreted in context.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { trpc } from "../lib/trpc";
import {
  allSlashCommands,
  getWidget,
  matchContextCommand,
  matchDiffCommand,
  matchDraftsCommand,
  matchExampleCommand,
  matchFactsCommand,
  matchHelpCommand,
  matchNewCommand,
  matchResearchCommand,
  matchSessionCommand,
  matchSummaryCommand,
  matchUseCommand,
  matchVizCommand,
  matchWidgetCommand,
  widgetDraftText,
  widgetExampleText,
  widgetHelpDetail,
  widgetHelpText,
} from "./widgets/registry";
import type { WidgetInit, WidgetOutput } from "./widgets/types";

type ChatItem =
  // A text message — from the user, a widget, or the assistant (server reply).
  // `markdown` opts the bubble into basic markdown rendering (bold + inline code).
  | { kind: "message"; id: string; role: "user" | "widget" | "assistant"; content: string; markdown?: boolean }
  // An inline interactive widget instance, optionally prefilled by the router.
  | { kind: "widget"; id: string; type: string; init?: WidgetInit }
  // A /research result: plain-text advice plus clickable web sources.
  | { kind: "research"; id: string; advice: string; sources: { title: string; url: string }[] }
  // A /viz result: an LLM-drawn SVG system diagram of the current decision.
  | { kind: "viz"; id: string; title: string; svg: string }
  // An "Add context" panel: attach a text document to the session (→ Honcho).
  | { kind: "context"; id: string };

const uid = () => crypto.randomUUID();

// Shared style for the hamburger menu's items.
const menuItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  textAlign: "left",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: "var(--dec-text)",
  cursor: "pointer",
};

export function ChatView() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  // Composer height: collapsed (1 row) or expanded (4 rows) via the expand button.
  const [expanded, setExpanded] = useState(false);
  // Hamburger side menu (left of the composer) open/closed.
  const [menuOpen, setMenuOpen] = useState(false);
  // Slash-command autocomplete: highlighted row, and a dismiss flag (Escape).
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  // Slack-style up/down recall of previously sent lines. `sentHistory` is
  // chronological (oldest first); `histIndex` is the slot we're browsing (null
  // when not navigating).
  const [sentHistory, setSentHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Id for this chat session — scopes the context/memory stored in Honcho.
  // `/new` rotates it (and clears the stream) to start a fresh conversation.
  const [sessionId, setSessionId] = useState(() => uid());
  const send = trpc.chat.send.useMutation();
  const research = trpc.research.run.useMutation();
  const viz = trpc.viz.run.useMutation();
  const facts = trpc.facts.list.useMutation();
  const diff = trpc.facts.diff.useMutation();
  const summary = trpc.summary.run.useMutation();

  // Keep the latest item in view as the stream grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  // Focus the composer when the chat page opens, so you can type right away.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Slash-to-focus: pressing `/` anywhere on the page (when not already typing in
  // a field) jumps to the composer and starts a slash command, like Slack.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (typing) return; // already in a field — let it type normally
      e.preventDefault();
      inputRef.current?.focus();
      setDraft((d) => d + "/");
      setSlashDismissed(false);
      setSlashIndex(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      sessionId,
    });
    append({ kind: "message", id: uid(), role: "assistant", content: res.reply });
  };

  // Route a free-text message: show the reply, and if the router chose a widget,
  // drop it into the stream prefilled with the extracted choices.
  const routeMessage = async (content: string) => {
    const res = await send.mutateAsync({
      text: content,
      history: toHistory({ role: "user", content }),
      sessionId,
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
      const res = await research.mutateAsync({ question, history: toHistory(), sessionId });
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

  // `/viz [decision]` → ask the LLM to draw an SVG system diagram of the current
  // decision (explicit args win, else the current decision) and inject it inline.
  const runViz = async (args: string) => {
    const question = args.trim() || lastDecision();
    if (!question) {
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content: "Nothing to visualise yet — describe a decision first, or run `/viz <your decision>`.",
      });
      return;
    }
    append({ kind: "message", id: uid(), role: "user", content: `/viz ${question}` });
    try {
      const res = await viz.mutateAsync({ question, history: toHistory() });
      append({ kind: "viz", id: uid(), title: res.title, svg: res.svg });
    } catch (err) {
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content: err instanceof Error ? err.message : "Could not generate a diagram. Please try again.",
      });
    }
  };

  // `/new` → start a fresh conversation: clear the stream and rotate the session
  // id so the server (Honcho) tracks this as a new, separate decision.
  const newSession = () => {
    setSessionId(uid());
    setItems([]);
    setDraft("");
  };

  // `/facts` → ask Honcho what it has concluded about the user in this session
  // and list each fact's content.
  const runFacts = async () => {
    append({ kind: "message", id: uid(), role: "user", content: "/facts" });
    try {
      const res = await facts.mutateAsync({ sessionId });
      const body = res.facts.length
        ? ["**What I know so far (this session)**", "", ...res.facts.map((f) => `• ${f}`)].join("\n")
        : "I haven't learned any facts about you yet — chat a bit and I'll start to.";
      append({ kind: "message", id: uid(), role: "assistant", content: body, markdown: true });
    } catch (err) {
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content: err instanceof Error ? err.message : "Could not fetch facts. Please try again.",
      });
    }
  };

  // `/diff` → compare DEC's conclusions about the user with the user's own
  // self-conclusions, grouped into shared / DEC-only / self-only.
  const runDiff = async () => {
    append({ kind: "message", id: uid(), role: "user", content: "/diff" });
    try {
      const res = await diff.mutateAsync({ sessionId });
      const sections: string[] = [];
      if (res.both.length)
        sections.push("**Both DEC and you**", ...res.both.map((f) => `• ${f}`), "");
      if (res.onlyDec.length)
        sections.push("**Only DEC infers about you**", ...res.onlyDec.map((f) => `• ${f}`), "");
      if (res.onlySelf.length)
        sections.push("**Only your self-view**", ...res.onlySelf.map((f) => `• ${f}`), "");
      const body = sections.length
        ? ["**Perspective diff (this session)**", "", ...sections].join("\n").trimEnd()
        : "No conclusions on either side yet — chat a bit and I'll start to form a view of you.";
      append({ kind: "message", id: uid(), role: "assistant", content: body, markdown: true });
    } catch (err) {
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content: err instanceof Error ? err.message : "Could not compare perspectives. Please try again.",
      });
    }
  };

  // `/summary` → recall the session from Honcho and write a short recap.
  const runSummary = async () => {
    append({ kind: "message", id: uid(), role: "user", content: "/summary" });
    try {
      const res = await summary.mutateAsync({ sessionId, history: toHistory() });
      append({ kind: "message", id: uid(), role: "assistant", content: res.summary });
    } catch (err) {
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content: err instanceof Error ? err.message : "Could not summarise. Please try again.",
      });
    }
  };

  // Handle one composer line — from the textarea (submit) or a widget's
  // onCommand (e.g. the `?` button sending "/help sc"). Draft management lives in
  // the callers, so a widget firing a command never clears the user's draft.
  const handleInput = (raw: string) => {
    const content = raw.trim();
    if (
      !content ||
      send.isPending ||
      research.isPending ||
      viz.isPending ||
      facts.isPending ||
      diff.isPending ||
      summary.isPending
    )
      return;

    // `/new` → start a fresh session (clears the stream, new session id).
    if (matchNewCommand(content)) {
      newSession();
      return;
    }

    // `/session` → show the current client session id (handled locally) so you
    // can look this conversation up in Honcho.
    if (matchSessionCommand(content)) {
      append({ kind: "message", id: uid(), role: "user", content: "/session" });
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content: `**Session id**\n\n\`${sessionId}\``,
        markdown: true,
      });
      return;
    }

    // `/facts` → list what Honcho has concluded about the user this session.
    if (matchFactsCommand(content)) {
      void runFacts();
      return;
    }

    // `/diff` → compare DEC's view of the user with the user's self-view.
    if (matchDiffCommand(content)) {
      void runDiff();
      return;
    }

    // `/summary` → recall + short recap of the current decision.
    if (matchSummaryCommand(content)) {
      void runSummary();
      return;
    }

    // `/research [decision]` → web-augmented deeper advice (not a widget).
    const res = matchResearchCommand(content);
    if (res) {
      void runResearch(res.args);
      return;
    }

    // `/viz [decision]` → on-the-fly SVG diagram of the current decision.
    const v = matchVizCommand(content);
    if (v) {
      void runViz(v.args);
      return;
    }

    // `/context` → drop an "Add context" panel to attach a text document to the
    // session (stored in Honcho, retrievable by later turns).
    if (matchContextCommand(content)) {
      append({ kind: "context", id: uid() });
      return;
    }

    // `/drafts` → list the experimental widgets hidden from the main menus.
    if (matchDraftsCommand(content)) {
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content: widgetDraftText(),
        markdown: true,
      });
      return;
    }

    // `/help` → list all widget shortcuts; `/help <name>` (e.g. /help sc) → that
    // widget's how-to. Handled locally (no server round-trip).
    const help = matchHelpCommand(content);
    if (help) {
      append({
        kind: "message",
        id: uid(),
        role: "assistant",
        content: help.kind === "list" ? widgetHelpText() : widgetHelpDetail(help.entry),
        markdown: true,
      });
      return;
    }

    // `/ex` → example prompts. Bare `/ex` lists one example per widget; `/ex
    // <widget>` (e.g. `/ex eis`) sends that widget's example decision through the
    // router exactly as if the user typed it — so they get a real LLM answer and
    // the surfaced widget, prefilled.
    const ex = matchExampleCommand(content);
    if (ex) {
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
      return;
    }

    // Free text → echo it, then let the server's convo router decide.
    append({ kind: "message", id: uid(), role: "user", content });
    void routeMessage(content);
  };

  // Submit the composer textarea, clearing the draft once accepted.
  const submit = () => {
    if (!draft.trim() || send.isPending || research.isPending) return;
    const line = draft;
    handleInput(line);
    setDraft("");
    // Record the sent line for up-arrow recall (skip exact consecutive repeats)
    // and reset the recall cursor.
    setSentHistory((h) => (h[h.length - 1] === line ? h : [...h, line]));
    setHistIndex(null);
  };

  // Up/down-arrow recall of previously sent lines (Slack-style). Up walks back
  // through history; down walks forward and finally back to a blank draft.
  // Returns true if it handled the key (so the caller stops default movement).
  const recallHistory = (dir: "up" | "down"): boolean => {
    if (sentHistory.length === 0) return false;
    if (dir === "up") {
      // Only hijack Up when there's nothing to move the caret through, or we're
      // already browsing history — otherwise let it move within a multi-line draft.
      if (histIndex === null && draft !== "") return false;
      const next = histIndex === null ? sentHistory.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(next);
      setDraft(sentHistory[next]);
      return true;
    }
    // down
    if (histIndex === null) return false;
    const next = histIndex + 1;
    if (next >= sentHistory.length) {
      setHistIndex(null);
      setDraft("");
    } else {
      setHistIndex(next);
      setDraft(sentHistory[next]);
    }
    return true;
  };

  // Slash-command autocomplete (Slack/Discord style). The popup shows while the
  // draft is a bare `/word` (no space yet), filtered by that word; the rows are
  // every widget command + chat action. Selecting one fills `/<command> `.
  const slashWord = draft.match(/^\/(\w*)$/)?.[1];
  const slashMatches =
    slashWord !== undefined && !slashDismissed
      ? allSlashCommands().filter((c) => c.command.startsWith(slashWord.toLowerCase()))
      : [];
  const showSlash = slashMatches.length > 0;
  const slashSel = Math.min(slashIndex, slashMatches.length - 1);

  const selectSlash = (command: string) => {
    setDraft(`/${command} `);
    setSlashIndex(0);
    setSlashDismissed(false);
    inputRef.current?.focus();
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
            <p style={{ color: "var(--dec-text-subtle)", fontSize: 14, marginTop: 24, lineHeight: 1.6 }}>
              Describe a decision (e.g. "should I join a startup?") and I'll
              surface a thinking framework to help.
              <br />
              Type <code>/help</code> for more.
            </p>
          )}

          {items.map((it) => {
            if (it.kind === "message") {
              return <MessageBubble key={it.id} role={it.role} content={it.content} markdown={it.markdown} />;
            }
            if (it.kind === "research") {
              return <ResearchBubble key={it.id} advice={it.advice} sources={it.sources} />;
            }
            if (it.kind === "viz") {
              return <VizBubble key={it.id} title={it.title} svg={it.svg} />;
            }
            if (it.kind === "context") {
              return <AddContextPanel key={it.id} sessionId={sessionId} />;
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
                  onCommand={handleInput}
                />
              </div>
            );
          })}
          {(send.isPending ||
            research.isPending ||
            viz.isPending ||
            facts.isPending ||
            diff.isPending ||
            summary.isPending) && (
            <MessageBubble
              role="assistant"
              content={
                research.isPending
                  ? "Researching…"
                  : viz.isPending
                    ? "Visualising…"
                    : facts.isPending
                      ? "Recalling…"
                      : diff.isPending
                        ? "Comparing…"
                        : summary.isPending
                          ? "Summarising…"
                          : "…"
              }
            />
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer pinned to the bottom */}
      <div style={{ borderTop: "1px solid var(--dec-border-soft)", background: "var(--dec-surface)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: 12, position: "relative", display: "flex", alignItems: "flex-end", gap: 8 }}>
          {/* Slash-command autocomplete popup */}
          {showSlash && (
            <div
              role="listbox"
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: "calc(100% - 6px)",
                zIndex: 22,
                maxHeight: 260,
                overflowY: "auto",
                padding: 4,
                borderRadius: 10,
                border: "1px solid var(--dec-border)",
                background: "var(--dec-surface)",
                boxShadow: "0 4px 16px #0007",
              }}
            >
              {slashMatches.map((c, i) => (
                <button
                  key={c.command}
                  type="button"
                  role="option"
                  aria-selected={i === slashSel}
                  // mousedown (not click) so the textarea doesn't blur first.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSlash(c.command);
                  }}
                  onMouseEnter={() => setSlashIndex(i)}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    background: i === slashSel ? "var(--dec-accent-soft)" : "transparent",
                    color: "var(--dec-text)",
                  }}
                >
                  <code style={{ fontSize: 12, fontWeight: 700, color: "var(--dec-text)", flexShrink: 0 }}>
                    /{c.command}
                  </code>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{c.title}</span>
                  <span style={{ fontSize: 11, color: "var(--dec-text-subtle)", marginLeft: "auto" }}>
                    {c.description}
                  </span>
                </button>
              ))}
            </div>
          )}
          {/* Hamburger side menu */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              title="Menu"
              aria-label="Open menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                height: 41,
                width: 40,
                fontSize: 16,
                borderRadius: 10,
                border: "1px solid var(--dec-border)",
                background: "var(--dec-surface-2)",
                color: "var(--dec-text-muted)",
                cursor: "pointer",
              }}
            >
              ☰
            </button>
            {menuOpen && (
              <>
                {/* click-away backdrop */}
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 20 }}
                />
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 6px)",
                    left: 0,
                    zIndex: 21,
                    minWidth: 190,
                    padding: 4,
                    borderRadius: 10,
                    border: "1px solid var(--dec-border)",
                    background: "var(--dec-surface)",
                    boxShadow: "0 4px 16px #0007",
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      handleInput("/new");
                    }}
                    style={menuItemStyle}
                  >
                    ✚ New chat
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      append({ kind: "context", id: uid() });
                      setMenuOpen(false);
                    }}
                    style={menuItemStyle}
                  >
                    📎 Upload documents
                  </button>
                </div>
              </>
            )}
          </div>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              // Re-open the slash popup on each keystroke and reset the highlight.
              setSlashDismissed(false);
              setSlashIndex(0);
              // Typing ends history recall — further edits are the user's own.
              setHistIndex(null);
            }}
            onKeyDown={(e) => {
              // When the slash popup is open, the arrow/enter/tab/esc keys drive
              // it instead of the textarea.
              if (showSlash) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSlashIndex((i) => (i + 1) % slashMatches.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  selectSlash(slashMatches[slashSel].command);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setSlashDismissed(true);
                  return;
                }
              }
              // Slack-style recall of previously sent lines.
              if (e.key === "ArrowUp" && recallHistory("up")) {
                e.preventDefault();
                return;
              }
              if (e.key === "ArrowDown" && recallHistory("down")) {
                e.preventDefault();
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="type /help or /ex for examples"
            rows={expanded ? 4 : 1}
            style={{
              flex: 1,
              resize: "none",
              padding: "10px 12px",
              fontSize: 14,
              lineHeight: 1.4,
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
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse input" : "Expand input"}
            aria-label={expanded ? "Collapse input" : "Expand input"}
            style={{
              height: 41,
              width: 40,
              flexShrink: 0,
              fontSize: 15,
              borderRadius: 10,
              border: "1px solid var(--dec-border)",
              background: "var(--dec-surface-2)",
              color: "var(--dec-text-muted)",
              cursor: "pointer",
            }}
          >
            {expanded ? "⤡" : "⤢"}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            style={{
              height: 41,
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

// Strip anything potentially executable from LLM-generated SVG before we inject
// it with dangerouslySetInnerHTML: scripts, embedded HTML (foreignObject),
// external images, inline event handlers, and javascript: URIs. Also trims any
// prose around the markup down to the <svg>…</svg> element.
function sanitizeSvg(raw: string): string {
  const start = raw.indexOf("<svg");
  const end = raw.lastIndexOf("</svg>");
  let svg = start !== -1 && end !== -1 ? raw.slice(start, end + 6) : raw;
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<image[\s\S]*?>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
  return svg;
}

// A /viz result: an LLM-drawn SVG "system diagram" of the decision, injected
// into the page (after sanitising) with a short title above it.
function VizBubble({ title, svg }: { title: string; svg: string }) {
  const clean = sanitizeSvg(svg);
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "85%",
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          background: "var(--dec-surface-2)",
          color: "var(--dec-text)",
          border: "1px solid var(--dec-border-soft)",
        }}
      >
        {title && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dec-text-subtle)", marginBottom: 6 }}>
            {title}
          </div>
        )}
        <div
          style={{ width: "100%", overflowX: "auto" }}
          // Sanitised above; SVG presentation elements only.
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      </div>
    </div>
  );
}

// "Add context" panel — attach a plain-text document to the chat session. The
// file is read in the browser (text only, no conversion) and stored in Honcho
// via context.add, so later turns (e.g. /research) can retrieve it.
const MAX_CONTEXT_CHARS = 200_000;

function isTextFile(f: File): boolean {
  return f.type.startsWith("text/") || /\.(txt|md|markdown|csv|log|json|text)$/i.test(f.name);
}

function AddContextPanel({ sessionId }: { sessionId: string }) {
  const add = trpc.context.add.useMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState<{ filename: string; chars: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setDone(null);
    if (!isTextFile(file)) {
      setError("Only text files are supported for now (.txt, .md, …).");
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("Couldn't read that file.");
      return;
    }
    if (!text.trim()) {
      setError("That file is empty.");
      return;
    }
    if (text.length > MAX_CONTEXT_CHARS) {
      setError(`Too large — keep it under ${Math.round(MAX_CONTEXT_CHARS / 1000)}k characters.`);
      return;
    }
    try {
      const res = await add.mutateAsync({ sessionId, filename: file.name, text });
      setDone({ filename: file.name, chars: res.chars });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not store the context.");
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        style={{
          width: "100%",
          maxWidth: 460,
          padding: 14,
          borderRadius: 12,
          background: "var(--dec-surface-2)",
          border: `1.5px dashed ${dragOver ? "var(--dec-accent)" : "var(--dec-border)"}`,
          color: "var(--dec-text)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📄 Add context</div>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--dec-text-subtle)" }}>
          Drop a text file here, or pick one — it's attached to this chat so the
          assistant and <code>/research</code> can use it.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.markdown,.csv,.log,.json,text/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={add.isPending}
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "7px 14px",
            borderRadius: 8,
            border: "none",
            background: add.isPending ? "var(--dec-border)" : "var(--dec-accent)",
            color: add.isPending ? "var(--dec-text-subtle)" : "#0f1115",
            cursor: add.isPending ? "wait" : "pointer",
          }}
        >
          {add.isPending ? "Uploading…" : "Add context"}
        </button>
        {done && (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--dec-merged)" }}>
            ✓ Added <strong>{done.filename}</strong> ({done.chars.toLocaleString()} chars)
          </div>
        )}
        {error && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#ff8b8b" }}>{error}</div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  markdown,
}: {
  role: "user" | "widget" | "assistant";
  content: string;
  markdown?: boolean;
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
        {markdown ? renderMarkdown(content) : content}
      </div>
    </div>
  );
}

// Minimal markdown rendering for chat bubbles — just what /help needs: bold
// (**text**) and inline code (`text`), line by line. Deliberately tiny: no
// dependency, no block grammar, no HTML injection.
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Tokens: `code` or **bold**. Everything else is plain text.
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <code
          key={k++}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "0.9em",
            padding: "1px 5px",
            borderRadius: 5,
            background: "var(--dec-surface)",
            border: "1px solid var(--dec-border-soft)",
          }}
        >
          {m[1]}
        </code>,
      );
    } else if (m[2] !== undefined) {
      out.push(
        <strong key={k++} style={{ fontWeight: 700 }}>
          {m[2]}
        </strong>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderMarkdown(text: string): ReactNode[] {
  return text.split("\n").map((line, i) => (
    <div key={i} style={{ minHeight: line.trim() ? undefined : "0.6em" }}>
      {renderInline(line)}
    </div>
  ));
}
