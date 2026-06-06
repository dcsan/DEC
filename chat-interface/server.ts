import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Initialize the Google Gemini AI Client as described in the system skills
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_KEY || process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Standard Gemini Models via Direct Integration
const AVAILABLE_MODELS = [
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Recommended)" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Analytical)" },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Server status and configured keys info
  app.get("/api/status", (req, res) => {
    const activeKey = process.env.GOOGLE_GEMINI_KEY || process.env.GEMINI_API_KEY;
    res.json({
      hasGeminiKey: !!activeKey,
      availableModels: AVAILABLE_MODELS,
    });
  });

  // API Route: Custom system instructions injected for Google Gemini
  const SYSTEM_INSTRUCTIONS = `
You are a highly analytical AI Coding Assistant that can speak normally and generate interactive, live-render react UI components and data visualizations directly within the chat message.

When the user asks for a chart, a visual representation, a calculator, a budget planner, a checklist, a Kanban board, a matrix, or any tool that can benefit from dynamic user interaction:
You MUST output a single \`\`\`interactive-ui\`\`\` code block containing a valid JSON object matching one of the schemas specified below. Do not put any extra text inside the code block, only the JSON.

You can continue writing normal text before or after the code block to explain your designs, answer questions, or summarize trends.

SPECIFICATIONS OF AVAILABLE REACT UI COMPONENTS:

1. ChartWidget (Renders custom interactive charts using Recharts: line, bar, area, pie, or composed)
JSON structure:
{
  "component": "ChartWidget",
  "props": {
    "type": "line" | "bar" | "area" | "pie" | "composed",
    "title": "Chart Title",
    "description": "Short explanation of what the chart represents",
    "xAxisKey": "label",
    "dataKeys": [
      { "key": "revenue", "label": "Revenue ($)", "color": "#10b981" },
      { "key": "expenses", "label": "Expenses ($)", "color": "#f43f5e" }
    ],
    "data": [
      { "label": "Q1", "revenue": 12000, "expenses": 8500 },
      { "label": "Q2", "revenue": 18500, "expenses": 11000 },
      { "label": "Q3", "revenue": 24000, "expenses": 15000 },
      { "label": "Q4", "revenue": 35000, "expenses": 18500 }
    ]
  }
}

2. PlannerWidget (Creates interactive real-time numerical solvers with sliders and auto-calculating math formulas)
Formula parsing details:
The component computes live calculations. Each metric will display the computed value of its "formula" expression, where variables correspond to the sliders' keys. Support basic arithmetic: +, -, *, /, Math.pow, Math.sqrt, etc. (e.g. "income - expenses" or "p * Math.pow(1 + r, n)").
JSON structure:
{
  "component": "PlannerWidget",
  "props": {
    "title": "Workspace Financial Planner",
    "description": "Adjust sliders to see your projected net worth and investments grow",
    "sliders": [
      { "key": "income", "label": "Monthly Income", "min": 2000, "max": 20000, "defaultValue": 6500, "step": 100, "prefix": "$" },
      { "key": "savingsRate", "label": "Savings Rate (%)", "min": 5, "max": 80, "defaultValue": 20, "step": 1, "suffix": "%" },
      { "key": "years", "label": "Investment Period", "min": 1, "max": 40, "defaultValue": 10, "step": 1, "suffix": " years" }
    ],
    "metrics": [
      { "label": "Monthly Savings Amount", "formula": "income * (savingsRate / 100)", "prefix": "$", "description": "Money saved each month" },
      { "label": "Projected Growth (No Interest)", "formula": "income * (savingsRate / 100) * 12 * years", "prefix": "$", "description": "Raw accumulated principal" },
      { "label": "Projected Growth (7% Compound Int.)", "formula": "(income * (savingsRate / 100) * 12) * ((Math.pow(1.07, years) - 1) / 0.07)", "prefix": "$", "description": "Future value of monthly savings compounded annually at 7% per year" }
    ]
  }
}

3. ChecklistWidget (Renders project milestones/checklists categorized into sections, with progress bars)
JSON structure:
{
  "component": "ChecklistWidget",
  "props": {
    "title": "Launch Roadmap Milestone Checklist",
    "categories": [
      {
        "name": "General Execution",
        "items": [
          { "id": "1", "name": "Finalize code review of backend routes", "completed": true, "priority": "high", "desc": "Check token authorization handles Google Gemini limits" },
          { "id": "2", "name": "Set up environment examples", "completed": false, "priority": "medium", "desc": "Provide .env.example with Google Gemini keys defined" }
        ]
      },
      {
        "name": "Design & Verification",
        "items": [
          { "id": "3", "name": "Validate responsive layouts", "completed": false, "priority": "high", "desc": "Check mobile margins on chat widgets" },
          { "id": "4", "name": "Design interactive charts", "completed": true, "priority": "low", "desc": "Validate Recharts handles custom colors correctly" }
        ]
      }
    ]
  }
}

4. KanbanWidget (Renders an interactive project board allowing you to click and shift tasks through different lanes)
JSON structure:
{
  "component": "KanbanWidget",
  "props": {
    "title": "Project Scrum Board",
    "columns": [
      {
        "id": "backlog",
        "title": "Backlog",
        "tasks": [
          { "id": "t1", "title": "Implement OAuth scope fallback", "description": "Add Google security verification bounds", "tags": ["Backend", "Auth"] }
        ]
      },
      {
        "id": "todo",
        "title": "To Do",
        "tasks": [
          { "id": "t2", "title": "Refine typography spacing", "description": "Make display elements stand out using elegant negative space", "tags": ["UI", "CSS"] },
          { "id": "t3", "title": "Conduct user validation testing", "description": "Verify slider bounds on the interactive planner widget", "tags": ["QA"] }
        ]
      },
      {
        "id": "progress",
        "title": "In Progress",
        "tasks": [
          { "id": "t4", "title": "Google Gemini SDK integration", "description": "Pipe secure requests through host port 3000", "tags": ["API", "Server"] }
        ]
      },
      {
        "id": "done",
        "title": "Done",
        "tasks": [
          { "id": "t5", "title": "Bootstrap theme styling configuration", "description": "Tailwind configuration imports done in main index.css", "tags": ["Design"] }
        ]
      }
    ]
  }
}

5. ComparisonWidget (An interactive decision matrix where user compares rows by rating values using live sliders to recalculate ranking scores)
JSON structure:
{
  "component": "ComparisonWidget",
  "props": {
    "title": "CRM Provider Matrix",
    "columns": [
      { "key": "name", "label": "Vendor Name" },
      { "key": "price", "label": "Base USD / Mo" },
      { "key": "simplicity", "label": "Simplicity Score (1-10)" },
      { "key": "support", "label": "Support Level" }
    ],
    "rows": [
      { "id": "v1", "values": { "name": "Salesforce Cloud", "price": "$150", "simplicity": 4, "support": "Enterprise SLA" } },
      { "id": "v2", "values": { "name": "Hubspot Suite", "price": "$80", "simplicity": 8, "support": "Email + Chat Support" } },
      { "id": "v3", "values": { "name": "Pipedrive Pro", "price": "$35", "simplicity": 9, "support": "24/7 Priority Support" } }
    ]
  }
}

Whenever you construct a visual widget, explain what it is in your normal chat paragraph first, output the code block \`\`\`interactive-ui ... \`\`\` and then conclude with a highly analytical breakdown.
`;

  // API Route: Handle Chat Completion
  app.post("/api/chat", async (req, res) => {
    const { messages, model = "google/gemini-2.5-flash" } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const geminiApiKey = process.env.GOOGLE_GEMINI_KEY || process.env.GEMINI_API_KEY;

    // Graceful fallback if NO Gemini API key exists
    if (!geminiApiKey) {
      console.warn("Google Gemini API Key is missing. Triggering graceful client-side fallback demonstration.");
      
      const lastUserMsgClean = String(messages[messages.length - 1]?.content || "").toLowerCase();

      // We simulate a smart response based on what they asked to demonstrate the widgets immediately!
      let replyContent = "";
      if (lastUserMsgClean.includes("chart") || lastUserMsgClean.includes("visualize") || lastUserMsgClean.includes("data") || lastUserMsgClean.includes("metrics")) {
        replyContent = `### Simulated Insights: Revenue & Cost Performance Analysis

Since your Google Gemini API Key is currently not set, I have generated this interactive **Chart Widget** using our **resilient local development responder**. This allows you to explore the interactive visual elements we've built into this chat app!

Here is the financial performance chart indicating the strong revenue scaling against fixed cost profiles:

\`\`\`interactive-ui
{
  "component": "ChartWidget",
  "props": {
    "type": "composed",
    "title": "Quarterly Revenue Scaling & Expenses",
    "description": "Comparison of scaling revenue streams against system baseline overhead expenses",
    "xAxisKey": "label",
    "dataKeys": [
      { "key": "revenue", "label": "Total Revenue ($)", "color": "#3b82f6" },
      { "key": "expenses", "label": "Baseline Overhead ($)", "color": "#ef4444" },
      { "key": "margin", "label": "Net Profit Margin (%)", "color": "#10b981" }
    ],
    "data": [
      { "label": "Q1 Baseline", "revenue": 15000, "expenses": 12000, "margin": 20 },
      { "label": "Q2 Launch", "revenue": 28000, "expenses": 14000, "margin": 50 },
      { "label": "Q3 Scale", "revenue": 45000, "expenses": 16500, "margin": 63 },
      { "label": "Q4 Peak", "revenue": 68000, "expenses": 19000, "margin": 72 }
    ]
  }
}
\`\`\`

#### Key Takeaways:
1. **Uncapped Profit Leverage**: The net margin expands dramatically from **20%** to **72%** within four quarters due to stable baseline operational costs.
2. **Interactive Filtering**: You can click the items in the chart's legend in the widget above, toggle the visibility of curves, select different visual shapes, or mock export this dataset directly!

*To enable real AI conversations, please add your **GOOGLE_GEMINI_KEY** in the Secrets panel or env configuration!*`;
      } else if (lastUserMsgClean.includes("budget") || lastUserMsgClean.includes("planner") || lastUserMsgClean.includes("calc") || lastUserMsgClean.includes("slider") || lastUserMsgClean.includes("finance")) {
        replyContent = `### Personal Investment & Budget Optimization Planner

I see you want to forecast budgeting and financials! To demonstrate our interactive **Planner Widget**, I've loaded a dynamic monetary evaluator below:

\`\`\`interactive-ui
{
  "component": "PlannerWidget",
  "props": {
    "title": "Interactive Savings & Compounding Future Estimator",
    "description": "Drag the sliders below to recalculate monthly savings bounds and compound wealth accumulations over time.",
    "sliders": [
      { "key": "monthlySalary", "label": "Baseline Monthly Salary", "min": 1500, "max": 25000, "defaultValue": 5500, "step": 100, "prefix": "$" },
      { "key": "housingRent", "label": "Monthly Rent & Living Expenses", "min": 500, "max": 8000, "defaultValue": 1800, "step": 50, "prefix": "$" },
      { "key": "savingsPercentage", "label": "Remaining Salary to Invest (%)", "min": 5, "max": 100, "defaultValue": 40, "step": 5, "suffix": "%" },
      { "key": "growthYears", "label": "Compound Horizon (Years)", "min": 1, "max": 45, "defaultValue": 15, "step": 1, "suffix": " Yrs" }
    ],
    "metrics": [
      { "label": "Calculated Disposable Cash Flow", "formula": "monthlySalary - housingRent", "prefix": "$", "description": "Income leftover after structural living expenses" },
      { "label": "Total Active Investment (Per Month)", "formula": "(monthlySalary - housingRent) * (savingsPercentage / 100)", "prefix": "$", "description": "Actual money funneled into assets" },
      { "label": "Compound Wealth Valuation (8% Compound Rate)", "formula": "((monthlySalary - housingRent) * (savingsPercentage / 100) * 12) * ((Math.pow(1.08, growthYears) - 1) / 0.08)", "prefix": "$", "description": "Growth compounded at 8% annually across the selected horizon" }
    ]
  }
}
\`\`\`

Modify the parameters above in the interactive UI box! It runs calculation algorithms right inside your browser instantly.

*Note: Please connect your Google Gemini SDK by providing \`GOOGLE_GEMINI_KEY\` to query Gemini on specific real-time planning parameters.*`;
      } else if (lastUserMsgClean.includes("kanban") || lastUserMsgClean.includes("scrum") || lastUserMsgClean.includes("board") || lastUserMsgClean.includes("task") || lastUserMsgClean.includes("todo")) {
        replyContent = `### Product Sprint Gantt & Kanban Operations

Here is an interactive **Kanban Board** to reorganize your current project workflows. Since there is no active key set, this live responder lets you interact with this project:

\`\`\`interactive-ui
{
  "component": "KanbanWidget",
  "props": {
    "title": "Next-Gen Scrum Lifecycle",
    "columns": [
      {
        "id": "backlog",
        "title": "Backlog List",
        "tasks": [
          { "id": "kb-1", "title": "Incorporate Direct Gemini API SDK", "description": "Convert fetch completions to direct Google GenAI SDK calls", "tags": ["API", "Backend"] },
          { "id": "kb-2", "title": "Theme Color Picker", "description": "Allow choosing custom gradients and color templates", "tags": ["UI"] }
        ]
      },
      {
        "id": "todo",
        "title": "Under Refinement",
        "tasks": [
          { "id": "kb-3", "title": "Verify Recharts CSS layout overlays", "description": "Review chart wrapper width constraints inside chat boxes", "tags": ["CSS", "Bug"] }
        ]
      },
      {
        "id": "progress",
        "title": "Active Sprint",
        "tasks": [
          { "id": "kb-4", "title": "Configure full-stack environment boundaries", "description": "Set up tsx dev servers and esbuild compile targets", "tags": ["Arch", "Done"] }
        ]
      },
      {
        "id": "done",
        "title": "Released to Dev",
        "tasks": [
          { "id": "kb-5", "title": "Bootstrap clean layout frame", "description": "Establish main typography scale, scroll panels, and layout containers", "tags": ["Design"] }
        ]
      }
    ]
  }
}
\`\`\`

#### Project Action:
- You can click the **left or right arrows** on the cards in the widget above to move cards through colum workflows.
- Task counters dynamically update in the headers.

*Please provide your **Google Gemini key** to ask Gemini to generate customized, topic-specific Gantt boards or Kanban cards dynamically!*`;
      } else {
        replyContent = `👋 **Welcome to the Interactive Google Gemini Chat Workspace!**

I noticed that your **GOOGLE_GEMINI_KEY** is not configured yet. No worries! I have activated the **Interactive Sandbox Mode** so you can test all of our visual React widget capabilities.

Ask me questions with keywords like:
- **"chart"** or **"visualize"** to launch the interactive Chart UI.
- **"budget"**, **"planner"** or **"calculator"** to spin up the Slider numerical solver.
- **"kanban"** or **"tasks"** to examine the interactive Agile Kanban board.

---

### Sandbox Feature Demonstration: Milestone Review Checklist

To highlight the interactive list capability, check out this dynamic Checklist Widget:

\`\`\`interactive-ui
{
  "component": "ChecklistWidget",
  "props": {
    "title": "Setup Progress & Key Checkpoints",
    "categories": [
      {
        "name": "Integration Setup",
        "items": [
          { "id": "chk-1", "name": "Set up direct Gemini SDK integration", "completed": true, "priority": "high", "desc": "Initialize direct Google GenAI SDK" },
          { "id": "chk-2", "name": "Define GOOGLE_GEMINI_KEY environment variable", "completed": false, "priority": "high", "desc": "Required in the Secrets Panel for live Gemini models" }
        ]
      },
      {
        "name": "Visual Playground Elements",
        "items": [
          { "id": "chk-3", "name": "Construct Recharts rendering boxes", "completed": true, "priority": "medium", "desc": "Allows fluid resizing and legend clicks" },
          { "id": "chk-4", "name": "Implement formulas execution engine", "completed": true, "priority": "high", "desc": "Evaluates complex investment formulas dynamically in client React state" }
        ]
      }
    ]
  }
}
\`\`\`

You can check/uncheck items live above, which dynamically updates the completion percentage bar!

To connect **Gemini** and enjoy seamless real-time conversations, follow the system environment directions and supply your GOOGLE_GEMINI_KEY.`;
      }

      return res.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: replyContent,
            },
          },
        ],
        sandboxMode: true,
      });
    }

    try {
      // Structure model identifier correctly. Remove "google/" namespaces if present.
      let activeModel = model;
      if (activeModel.startsWith("google/")) {
        activeModel = activeModel.replace("google/", "");
      }
      if (activeModel.includes("2.5") || activeModel.includes("1.5")) {
        activeModel = "gemini-3.5-flash";
      }

      // Format messages into Google GenAI format (requires alternating roles user/model)
      const geminiContents = [];
      let expectedRole = "user";
      for (const m of messages) {
        if (!m.content || !m.content.trim()) continue;
        const mappedRole = m.role === "assistant" ? "model" : "user";
        if (mappedRole === expectedRole) {
          geminiContents.push({
            role: mappedRole,
            parts: [{ text: m.content }]
          });
          expectedRole = expectedRole === "user" ? "model" : "user";
        } else if (geminiContents.length > 0) {
          geminiContents[geminiContents.length - 1].parts.push({ text: m.content });
        }
      }

      if (geminiContents.length === 0) {
        return res.status(400).json({ error: "No user content provided." });
      }

      // Call Google Gemini API directly using the official SDK
      const response = await ai.models.generateContent({
        model: activeModel || "gemini-3.5-flash",
        contents: geminiContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "No text received from Gemini";

      return res.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: replyText,
            },
          },
        ],
      });
    } catch (e: any) {
      console.error("Express handler failed to connect with Google Gemini:", e);
      return res.status(500).json({ error: "Gemini API connection failure", details: e?.message || String(e) });
    }
  });

  // Vite middleware for development (handles compilation of frontend TSX assets on-the-fly)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
