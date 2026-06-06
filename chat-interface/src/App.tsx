/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Plus, 
  Trash2, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Code,
  Key,
  ChevronRight,
  TrendingUp,
  Sliders,
  CheckSquare,
  Award,
  BookOpen,
  Info,
  Menu,
  X,
  RefreshCw,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Message } from "./types";
import { InteractiveMarkdownRenderer } from "./components/InteractiveMarkdownRenderer";

const DEFAULT_SAMPLE_PROMPTS = [
  {
    icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    label: "Quarterly Performance Chart",
    prompt: "Visualize a comprehensive comparison chart of our quarterly revenue performance. Show expenses and net profit margins using compound types.",
    type: "chart"
  },
  {
    icon: <Sliders className="w-4 h-4 text-indigo-400" />,
    label: "Interactive Savings Planner",
    prompt: "Create an interactive investment planner slider layout with monthly savings metrics compounded at absolute 8% returns over a timeline.",
    type: "planner"
  },
  {
    icon: <Award className="w-4 h-4 text-violet-400" />,
    label: "Scrum Scrum Kanban Board",
    prompt: "Set up a detailed agile Scrum board for our SaaS launch with separate backlog, under refinement, active sprint, and released lanes.",
    type: "kanban"
  },
  {
    icon: <CheckSquare className="w-4 h-4 text-teal-400" />,
    label: "Module Roadmap Checklist",
    prompt: "Create an interactive milestone roadmap checklist tracking core sprint integrations, with tasks divided by category and customized priority tags.",
    type: "checklist"
  },
  {
    icon: <Sliders className="w-4 h-4 text-amber-400 rotate-90" />,
    label: "CRM Decision Matrix",
    prompt: "Construct an interactive decision comparison matrix for top CRM providers. Let them rank dynamically based on custom slider weights.",
    type: "comparison"
  }
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemTipIdx, setSystemTipIdx] = useState<string | null>(null);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Core status polling on startup
  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/status");
        if (response.ok) {
          const status = await response.json();
          setHasGeminiKey(status.hasGeminiKey);
          setAvailableModels(status.availableModels || []);
        }
      } catch (err) {
        console.error("Status checks failed on startup:", err);
      }
    }
    checkStatus();
  }, []);

  // Save/Restore historical thread states from local storage safely
  useEffect(() => {
    const cached = localStorage.getItem("direct_gemini_chat_history");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const mapped = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(mapped);
      } catch {
        // Safe clear if malformed
        localStorage.removeItem("direct_gemini_chat_history");
      }
    } else {
      // Intro Welcome Prompt
      setMessages([
        {
          id: "intro-msg",
          role: "assistant",
          content: `👋 **Welcome to the Interactive Google Gemini Chat Workspace!**

I am an advanced analytical assistant configured to help you craft normal messaging or compile fully interactive, live-reactive React UI components and data visualizations directly within our chat interface.

#### ✨ Interactive Sandbox Actions:
Click any of the **Quick Demo Cards** on the left panel (or below) to explore:
- **Interactive Charts (\`ChartWidget\`)** using customizable Recharts with legend toggles.
- **Parametric Financial Solvers (\`PlannerWidget\`)** mapping slider variables to safe formulas evaluated real-time in React.
- **Checkpoint Roadmaps (\`ChecklistWidget\`)** tracking categories and priorities with completion bars.
- **Agile boards (\`KanbanWidget\`)** allowing directional workflows moving card items across column states.
- **Decision Matrixes (\`ComparisonWidget\`)** ranking rows based on weighed criteria indices.

*Ready to connect real models? Update your \`GOOGLE_GEMINI_KEY\`!*`,
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("direct_gemini_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Adjust scroll lock on message increments
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleClearHistory = () => {
    localStorage.removeItem("direct_gemini_chat_history");
    setMessages([
      {
        id: "cleared-intro-msg",
        role: "assistant",
        content: "Cleared session cache! I'm in idle mode. Let's start fresh. Ask me for a chart, checklist, slider solver, comparison matric, or Kanban task board!",
        timestamp: new Date()
      }
    ]);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputVal).trim();
    if (!textToSend || isLoading) return;

    if (!customPrompt) {
      setInputVal("");
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const activeConvo = [...messages, userMessage];
      const payloadMessages = activeConvo.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          model: selectedModel
        })
      });

      if (!res.ok) {
        throw new Error(`Server proxy error (code ${res.status})`);
      }

      const responseData = await res.json();
      const replyText = responseData.choices?.[0]?.message?.content || "No text received from responder";
      const isSandboxResult = !!responseData.sandboxMode;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date(),
        modelUsed: isSandboxResult ? "Sandbox Fallback Engine" : selectedModel,
        isSandboxResponse: isSandboxResult
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Transmission error:", err);
      const networkErrorMessage: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `❌ **Failed to establish connection with server**
        
An error occurred while routing the payload to the local proxy:

\`\`\`
${err?.message || String(err)}
\`\`\`

**Troubleshooting Steps**:
1. Check that the back-end dev server is compiled.
2. Confirm you have defined \`GOOGLE_GEMINI_KEY\` in your local secrets if you are attempting live LLM generation.
3. Reload this container by triggering a Dev Server restart if resources appear stale.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, networkErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased" id="main-applet-frame">
      {/* Header Panel */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-40 select-none" id="applet-header-bar">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(prev => !prev)}
            className="lg:hidden text-slate-400 hover:text-slate-100 p-1 rounded-md hover:bg-slate-900 transition-colors"
            id="btn-toggle-sidebar-mobile"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-slate-50 flex items-center justify-center shadow-lg shadow-indigo-500/20" id="header-logo-container">
              <Sparkles className="w-5 h-5 text-indigo-100 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white mb-0" id="header-title">Nexus Chat</h1>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Interactive Direct Gemini Visualizer</span>
            </div>
          </div>
        </div>

        {/* Configurations Hub */}
        <div className="flex items-center gap-4" id="header-settings">
          {/* Engine Selector */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs" id="engine-dropdown-pane">
            <Bot className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-slate-200 outline-none font-semibold cursor-pointer max-w-xxs pr-1"
              id="select-active-gemini-model"
            >
              <optgroup label="Available Models">
                {availableModels.length > 0 ? (
                  availableModels.map(m => (
                    <option key={m.id} value={m.id} className="bg-slate-950 text-slate-200">{m.name}</option>
                  ))
                ) : (
                  <option value="gemini-3.5-flash" className="bg-slate-950 text-slate-300">Gemini 3.5 Flash</option>
                )}
              </optgroup>
            </select>
          </div>

          {/* Connection Standard state */}
          <div className="flex items-center gap-2" id="connection-state">
            {hasGeminiKey ? (
              <span className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-900/60 text-emerald-400 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full px-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Live connected</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-900/60 text-amber-400 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full px-3">
                <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                <span>Sandbox Sandbox Active</span>
              </span>
            )}

            <button
              onClick={handleClearHistory}
              className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800/60"
              title="Clear Thread History"
              id="btn-clear-chat-top"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Workspace frame layout */}
      <div className="flex-1 flex overflow-hidden lg:grid lg:grid-cols-12 min-h-0 relative" id="workspace-layout">
        {/* Left Drawer / Sidebar: Schemas Matrix and Component Launchers */}
        <aside className={`
          fixed inset-y-0 left-0 z-30 w-72 bg-slate-950 border-r border-slate-900 p-5 flex flex-col justify-between 
          transform transition-transform duration-300 lg:transform-none lg:static lg:col-span-3 lg:flex lg:z-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `} id="sidebar-widgets-index">
          <div className="space-y-6 overflow-y-auto max-h-[85vh] pr-1.5" id="sidebar-scrollable-zone">
            {/* Mobile Sidebar Close */}
            <div className="flex items-center justify-between lg:hidden border-b border-slate-900 pb-3 mb-2">
              <span className="text-xs font-bold text-indigo-400">Component Catalog</span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 p-1 hover:text-slate-100 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Widgets Demo Launchers */}
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 select-none">
                <Zap className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>Quick visual presets</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-4 leading-normal">
                Click any button to immediately inject a sample prompt to generate its corresponding custom-styled interactive components.
              </p>
              <div className="space-y-2" id="quick-preset-container">
                {DEFAULT_SAMPLE_PROMPTS.map((promptObj, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleSendMessage(promptObj.prompt);
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-900 bg-slate-950 hover:bg-slate-900 hover:border-slate-800 transition-all flex items-center gap-3 group text-xs font-medium text-slate-300 hover:text-white"
                    id={`btn-preset-launcher-${promptObj.type}`}
                  >
                    <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg group-hover:bg-slate-950 transition-colors">
                      {promptObj.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{promptObj.label}</span>
                        <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                      </div>
                      <span className="text-[9px] text-slate-500 truncate block mt-0.5">Mock trigger of {promptObj.type} ui</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Schemas Matrix Reference */}
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 select-none">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Components Guideline specs</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 leading-normal">
                Curious how Gemini generates these React visual components? The LLM conforms outputs to these strictly compiled JSON blocks:
              </p>

              <div className="space-y-2" id="schemas-index-box">
                {[
                  { id: "chart", title: "ChartWidget Schema", text: `{\n  "component": "ChartWidget",\n  "props": {\n    "type": "line" | "bar",\n    "title": "Scaling Summary",\n    "data": [{ "label": "Q1", "revenue": 1000 }]\n  }\n}` },
                  { id: "planner", title: "PlannerWidget Schema", text: `{\n  "component": "PlannerWidget",\n  "props": {\n    "title": "Savings Planner",\n    "sliders": [{ "key": "income", "min": 100 }],\n    "metrics": [{ "label": "Savings", "formula": "income * 0.2" }]\n  }\n}` },
                  { id: "checklist", title: "ChecklistWidget Schema", text: `{\n  "component": "ChecklistWidget",\n  "props": {\n    "title": "Milestones Matrix",\n    "categories": [{\n      "name": "Phase 1",\n      "items": [{ "id": "1", "name": "Code setup", "completed": false }]\n    }]\n  }\n}` }
                ].map(sch => (
                  <div key={sch.id} className="bg-slate-950 rounded-xl border border-slate-900 border-dashed p-2.5 overflow-hidden text-xs">
                    <button
                      onClick={() => setSystemTipIdx(systemTipIdx === sch.id ? null : sch.id)}
                      className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 text-[11px] font-semibold"
                    >
                      <span className="flex items-center gap-1">
                        <Code className="w-3 h-3 text-slate-500" />
                        <span>{sch.title}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-600">{systemTipIdx === sch.id ? "Hide" : "Show JSON"}</span>
                    </button>
                    {systemTipIdx === sch.id && (
                      <pre className="text-[9px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/80 mt-2 whitespace-pre overflow-x-auto max-h-32 leading-relaxed">
                        {sch.text}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-900 mt-4 text-[10px] text-slate-600 flex items-center gap-1.5 font-mono select-none" id="sidebar-footer-pane">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>React App sandbox on Cloud Run</span>
          </div>
        </aside>

        {/* Middle/Main Section: Chat Workspace */}
        <main className="col-span-9 flex flex-col min-w-0 bg-slate-950 border-l border-slate-900 relative flex-1" id="chat-scollable-pane">
          {/* Messages list feed container */}
          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 space-y-6" id="messages-scroller-node">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div 
                  key={message.id}
                  className={`flex gap-4 max-w-4xl mx-auto ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  id={`chat-message-row-${message.id}`}
                >
                  {/* Icon Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border select-none ${
                    isUser 
                      ? "bg-indigo-950 border-indigo-800 text-indigo-300 shadow-md shadow-indigo-500/10" 
                      : "bg-slate-900 border-slate-800 text-slate-400 shadow-sm"
                  }`} id={`avatar-${message.id}`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble box layouts */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {/* Header Convo info */}
                    <div className={`flex items-center gap-2 text-[10px] text-slate-500 font-mono select-none ${isUser ? "justify-end" : "justify-start"}`}>
                      <span className="font-semibold text-slate-400 capitalize">{message.role}</span>
                      <span>•</span>
                      <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                      {/* Display active execution models */}
                      {message.modelUsed && (
                        <>
                          <span>•</span>
                          <span className="bg-indigo-950/60 text-indigo-300 font-extrabold px-1.5 py-0.2 border border-indigo-900/40 rounded scale-95">
                            {message.modelUsed}
                          </span>
                        </>
                      )}
                    </div>

                    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isUser 
                        ? "bg-indigo-950/30 border-indigo-900/60 text-indigo-100 shadow-sm focus:ring-1 focus:ring-indigo-500" 
                        : "bg-slate-900/40 border-slate-900 text-slate-100 shadow-sm"
                    }`} id={`message-card-${message.id}`}>
                      {/* Check Connection warnings in context of Sandbox simulations */}
                      {!isUser && message.isSandboxResponse && (
                        <div className="bg-amber-950/40 border border-amber-900/45 px-3 py-2 rounded-xl mb-4 text-[11px] text-amber-300 flex items-start gap-2 leading-relaxed" id={`warning-banner-${message.id}`}>
                          <Key className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Local Sandbox Simulator Mode Active</span>
                            <span>For real-time chats with live Gemini LLM models, please configure an active <code className="bg-slate-950 px-1 py-0.1 border border-slate-800 rounded font-mono text-[10px] text-indigo-300">GOOGLE_GEMINI_KEY</code> key inside the UI secrets panel.</span>
                          </div>
                        </div>
                      )}

                      {/* Main Converted Text render */}
                      <InteractiveMarkdownRenderer content={message.content} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Skeleton generator when loading */}
            {isLoading && (
              <div className="flex gap-4 max-w-4xl mx-auto flex-row" id="chat-loading-skeleton">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    <span className="font-bold">Gemini Assistant</span>
                    <span>•</span>
                    <span className="text-indigo-400 animate-pulse">Consulting direct Gemini API...</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl max-w-3xl space-y-3.5">
                    {/* Pulsing bars */}
                    <div className="h-4 bg-slate-800 rounded-md animate-pulse w-3/4" />
                    <div className="h-4 bg-slate-800 rounded-md animate-pulse w-5/6" />
                    <div className="h-3 bg-slate-800 rounded-md animate-pulse w-1/2" />
                  </div>
                </div>
              </div>
            )}

            <div ref={endOfMessagesRef} />
          </div>

          {/* Quick tips notice for Sandbox users */}
          {messages.length < 3 && !hasGeminiKey && (
            <div className="max-w-2xl mx-auto px-4 pb-2 text-center select-none" id="sandbox-intro-footer-banner">
              <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-[10px] text-indigo-300 shadow-inner font-semibold">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tip: Click "Interactive Savings Planner" on the left sidebar to render a live parametric solver widget!</span>
              </div>
            </div>
          )}

          {/* User message input console */}
          <div className="border-t border-slate-900 p-4 bg-slate-950/40 backdrop-blur sticky bottom-0 z-10" id="input-footer-console">
            <div className="max-w-4xl mx-auto">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center"
                id="message-input-form"
              >
                <input
                  type="text"
                  placeholder="Ask for a financial chart showing Q1 expenses, a roadmap checklist, or standard conversational insights..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={isLoading}
                  className="w-full text-xs bg-slate-900 rounded-2xl border border-slate-800 pl-4 pr-14 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/35 transition-all text-sm pr-12"
                  id="chat-text-input-field"
                />
                
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isLoading}
                  className="absolute right-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 text-slate-50 rounded-xl flex items-center justify-center transition-all shadow-md shadow-indigo-600/20 shadow-none disabled:shadow-none hover:shadow-indigo-500/20 active:scale-95"
                  id="chat-btn-send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-2.5 px-1 select-none">
                <span>Enter text & press return to query local direct Google Gemini API endpoints.</span>
                <span className="hidden sm:inline">Supports custom Interactive React UI schemas inside backticks</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
