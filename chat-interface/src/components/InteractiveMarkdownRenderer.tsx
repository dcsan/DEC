/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import Markdown from "react-markdown";
import { 
  ChartWidget, 
  PlannerWidget, 
  ChecklistWidget, 
  KanbanWidget, 
  ComparisonWidget 
} from "./InteractiveComponents";
import { Copy, Check, RotateCw, AlertCircle } from "lucide-react";

interface InteractiveMarkdownRendererProps {
  content: string;
}

export function InteractiveMarkdownRenderer({ content }: InteractiveMarkdownRendererProps) {
  return (
    <div className="markdown-body text-slate-300 leading-relaxed text-sm space-y-4">
      <Markdown
        components={{
          // Intercept code blocks for custom interactive UI rendering
          code({ node, className, children, ...props }) {
            const isInteractive = /language-interactive-ui/.test(className || "");
            
            if (isInteractive) {
              const codeStr = String(children).trim();
              
              // Local error recovery safe parse
              try {
                // If it is an incomplete JSON or model is still generating, show a neat compile frame
                if (!codeStr.endsWith("}") && !codeStr.includes("]")) {
                  return (
                    <div className="bg-slate-950/80 border border-indigo-900/45 p-6 rounded-2xl flex items-center justify-center gap-3 my-4 select-none">
                      <RotateCw className="w-4 h-4 text-indigo-400 animate-spin" />
                      <span className="font-mono text-xs text-indigo-300">Assembling interactive UI component parameters...</span>
                    </div>
                  );
                }

                const payload = JSON.parse(codeStr);
                const { component, props: widgetProps } = payload;

                switch (component) {
                  case "ChartWidget":
                    return <ChartWidget {...widgetProps} />;
                  case "PlannerWidget":
                    return <PlannerWidget {...widgetProps} />;
                  case "ChecklistWidget":
                    return <ChecklistWidget {...widgetProps} />;
                  case "KanbanWidget":
                    return <KanbanWidget {...widgetProps} />;
                  case "ComparisonWidget":
                    return <ComparisonWidget {...widgetProps} />;
                  default:
                    return (
                      <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-mono my-4">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Unknown component identifier: "{component}"</span>
                      </div>
                    );
                }
              } catch (err: any) {
                // In case of JSON compilation crashes (like missing trailing brackets during typing transitions)
                return (
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl my-4 text-left">
                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
                      <RotateCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                      <span>Compiling live component parameters...</span>
                    </div>
                    <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto p-3 bg-slate-900 rounded-lg max-h-32">
                      {codeStr}
                    </pre>
                  </div>
                );
              }
            }

            // Standard code blocks layout decoration with real-time copy functionality
            const hasLang = /language-/.test(className || "");
            if (hasLang) {
              const lang = className!.replace("language-", "");
              return <StandardCodeBlock language={lang} code={String(children).trim()} />;
            }

            return (
              <code className={`${className} bg-slate-800 border border-slate-700/60 font-mono text-xs text-slate-300 px-1.5 py-0.5 rounded-md`} {...props}>
                {children}
              </code>
            );
          },

          // Styling standard markdown layouts for sleek UI integration
          p({ children }) {
            return <p className="mb-4 text-slate-300 font-sans leading-relaxed text-sm last:mb-0">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold tracking-tight text-white mt-5 mb-3 font-sans pb-1 border-b border-slate-800/60 first:mt-0">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold tracking-tight text-white mt-4 mb-2 font-sans pb-1 border-b border-slate-800/40 first:mt-0">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold tracking-tight text-white mt-4 mb-2 font-sans first:mt-0">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 mb-4 space-y-1.5 text-xs text-slate-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-xs text-slate-300">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return <blockquote className="border-l-4 border-indigo-500/60 bg-indigo-950/20 px-4 py-2.5 rounded-xl text-xs text-slate-400 font-mono my-4">{children}</blockquote>;
          }
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

// Copy Action for other standard codes (like Javascript, SQL, Python blocks generated by LLM)
function StandardCodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden my-4">
      {/* Top action indicator bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900 bg-slate-900/20 text-xs font-mono select-none">
        <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">{language}</span>
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 p-1 hover:bg-slate-900 rounded"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      {/* Code Text panel */}
      <pre className="p-4 overflow-x-auto text-xs font-mono text-indigo-200 bg-transparent leading-relaxed max-h-96">
        <code>{code}</code>
      </pre>
    </div>
  );
}
