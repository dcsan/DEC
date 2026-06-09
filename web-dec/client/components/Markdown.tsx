// Markdown renderer for chat bubbles. Wraps react-markdown (+ GFM: tables,
// strikethrough, task lists) and styles every element with the `--vizithink-*`
// theme tokens via inline styles — matching the project convention of no
// Tailwind classes / no hardcoded hex in components.

import type { CSSProperties, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const codeChip: CSSProperties = {
  fontFamily: mono,
  fontSize: "0.88em",
  padding: "1px 5px",
  borderRadius: 5,
  background: "var(--vizithink-surface)",
  border: "1px solid var(--vizithink-border-soft)",
};

// `react-markdown` v10 renders fenced blocks as <pre><code class="language-…">.
// We give inline `code` a chip look, but plain monospace when it's the child of
// a fenced block (detected via the `language-` class or a multi-line value) so
// the surrounding <pre> box owns the styling.
const components: Components = {
  p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>,
  h1: ({ children }) => <h2 style={heading(18)}>{children}</h2>,
  h2: ({ children }) => <h3 style={heading(16)}>{children}</h3>,
  h3: ({ children }) => <h4 style={heading(14.5)}>{children}</h4>,
  h4: ({ children }) => <h5 style={heading(13.5)}>{children}</h5>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
  del: ({ children }) => <del style={{ opacity: 0.7 }}>{children}</del>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "var(--vizithink-accent)", textDecoration: "underline" }}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      style={{
        margin: "0 0 8px",
        padding: "2px 0 2px 12px",
        borderLeft: "3px solid var(--vizithink-border)",
        color: "var(--vizithink-text-muted)",
      }}
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--vizithink-border-soft)", margin: "10px 0" }} />,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className || "") || String(children).includes("\n");
    if (isBlock) return <code style={{ fontFamily: mono, fontSize: "0.88em" }}>{children}</code>;
    return <code style={codeChip}>{children}</code>;
  },
  pre: ({ children }) => (
    <pre
      style={{
        margin: "0 0 8px",
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--vizithink-surface)",
        border: "1px solid var(--vizithink-border-soft)",
        overflowX: "auto",
        fontSize: "0.88em",
        lineHeight: 1.45,
      }}
    >
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "0 0 8px" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "0.95em" }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ border: "1px solid var(--vizithink-border-soft)", padding: "4px 8px", textAlign: "left", fontWeight: 700 }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ border: "1px solid var(--vizithink-border-soft)", padding: "4px 8px" }}>{children}</td>
  ),
};

function heading(fontSize: number): CSSProperties {
  return { margin: "10px 0 6px", fontSize, fontWeight: 700, lineHeight: 1.3 };
}

// Render markdown text. Wrapped in a div with `vt-md` so the last block's
// bottom margin can be trimmed (see callers / index.css if needed).
export function Markdown({ children }: { children: string }): ReactNode {
  return (
    <div className="vt-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
