// Widget framework for the standalone chat view (client/components/ChatView).
//
// A "widget" is a small, self-contained interactive tool that can be dropped
// into the chat with a slash command (e.g. `/pc`). It has two parts kept in
// separate files on purpose:
//
//   • a *spec* file (`*.spec.ts`) — pure, no React. Declares how the widget is
//     triggered and, crucially, how its data is FORMATTED into a chat message
//     when the user sends its result back. The spec is the widget's output
//     contract — the single place that defines how it "speaks" to the chat.
//   • a *component* file (`*.tsx`) — the standalone React UI that owns the
//     widget's live state and calls `spec.format(data)` on send.
//
// `registry.ts` pairs each spec with its component.

export interface WidgetSpec<TData = unknown> {
  /** Stable identifier for this widget type (matches the registry + chat items). */
  type: string;
  /** Slash-command triggers, without the leading slash. First is canonical. */
  commands: string[];
  /** Human-facing label. */
  title: string;
  /** One-line description, shown in hints/menus. */
  description: string;
  /** What this widget/chart is good for — its decision-making purpose. */
  purpose: string;
  /**
   * Turn the widget's current data into the text sent back to the chat.
   * Pure function — the whole point of the spec file is to keep this output
   * formatting in one obvious, React-free place.
   */
  format: (data: TData) => string;
}

// What a widget sends back to the chat: a structured payload AND a plain-text
// rendering, so the server can act on the data while the UI shows the text.
export interface WidgetOutput<TData = unknown> {
  /** The widget type that produced this (matches WidgetSpec.type). */
  type: string;
  /** Structured payload — the widget's raw data. */
  data: TData;
  /** Plain-text rendering, from the spec's `format`. */
  text: string;
}

// Props every widget component receives from the chat view.
export interface WidgetProps {
  /** Send the widget's output (structured + text) back into the chat. */
  onSend: (output: WidgetOutput) => void;
  /** Remove this widget instance from the chat. */
  onRemove: () => void;
}
