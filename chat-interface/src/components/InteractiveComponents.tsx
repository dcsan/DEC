/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, Fragment } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from "recharts";
import { 
  BarChart2, 
  LineChart as LineIcon, 
  TrendingUp, 
  PieChart as PieIcon, 
  CheckSquare, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  DollarSign, 
  HelpCircle,
  Sparkles,
  Award,
  Sliders,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChartWidgetProps,
  PlannerWidgetProps,
  ChecklistWidgetProps,
  KanbanWidgetProps,
  ComparisonWidgetProps,
  ChecklistItem,
  KanbanTask,
  KanbanColumn,
} from "../types";

// ==========================================
// UTILS
// ==========================================
const formatCurrency = (val: number | string): string => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
};

// ==========================================
// 1. CHART WIDGET
// ==========================================
export function ChartWidget({ type: initialType, title, description, xAxisKey = "label", dataKeys, data }: ChartWidgetProps) {
  const [chartType, setChartType] = useState<"line" | "bar" | "area" | "pie" | "composed">(initialType);
  const [hiddenKeys, setHiddenKeys] = useState<{ [key: string]: boolean }>({});
  const [hoveredDataPoint, setHoveredDataPoint] = useState<any | null>(null);

  const toggleKey = (key: string) => {
    setHiddenKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const chartData = useMemo(() => data || [], [data]);

  const activeDataKeys = useMemo(() => {
    return (dataKeys || []).filter(dk => !hiddenKeys[dk.key]);
  }, [dataKeys, hiddenKeys]);

  // Handle CSV Draft export
  const exportToCSV = () => {
    if (!chartData.length) return;
    const headers = Object.keys(chartData[0]).join(",");
    const rows = chartData.map(row => Object.values(row).join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, "_")}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalSumByKey = (key: string) => {
    return chartData.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl overflow-hidden my-4" id="chart-widget-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6" id="chart-header">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" id="chart-icon-trending" />
            <h4 className="text-lg font-semibold tracking-tight text-white mb-0" id="chart-title">{title}</h4>
          </div>
          {description && <p className="text-xs text-slate-400 mt-1" id="chart-desc">{description}</p>}
        </div>

        {/* Chart Type Switches */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto" id="chart-type-selector">
          {(["line", "bar", "area", "composed"] as const).map(t => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                chartType === t 
                  ? "bg-slate-800 text-emerald-400 shadow-sm" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id={`btn-chart-type-${t}`}
            >
              {t === "line" && <LineIcon className="w-3.5 h-3.5" />}
              {t === "bar" && <BarChart2 className="w-3.5 h-3.5" />}
              {t === "area" && <TrendingUp className="w-3.5 h-3.5" />}
              {t === "composed" && <Sparkles className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Core Wrapper */}
      <div className="h-64 sm:h-72 w-full pr-4" id="chart-visualizer-frame">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
            No data entries supplied to plot
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold", fontSize: "12px" }}
                />
                {activeDataKeys.map(dk => (
                  <Bar key={dk.key} dataKey={dk.key} name={dk.label} fill={dk.color} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            ) : chartType === "area" ? (
              <AreaChart data={chartData}>
                <defs>
                  {activeDataKeys.map(dk => (
                    <linearGradient key={dk.key} id={`grad-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={dk.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={dk.color} stopOpacity={0.01}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold", fontSize: "12px" }}
                />
                {activeDataKeys.map(dk => (
                  <Area key={dk.key} type="monotone" dataKey={dk.key} name={dk.label} stroke={dk.color} fill={`url(#grad-${dk.key})`} strokeWidth={2} />
                ))}
              </AreaChart>
            ) : chartType === "composed" ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold", fontSize: "12px" }}
                />
                {activeDataKeys.map((dk, index) => (
                  index === 0 
                    ? <Bar key={dk.key} dataKey={dk.key} name={dk.label} fill={dk.color} barSize={24} radius={[4, 4, 0, 0]} />
                    : <Line key={dk.key} type="monotone" dataKey={dk.key} name={dk.label} stroke={dk.color} strokeWidth={2.5} dot={{ r: 4 }} />
                ))}
              </ComposedChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold", fontSize: "12px" }}
                />
                {activeDataKeys.map(dk => (
                  <Line key={dk.key} type="monotone" dataKey={dk.key} name={dk.label} stroke={dk.color} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Metric Underbars (Toggles & Summaries) */}
      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3" id="chart-metrics-summary">
        {dataKeys.map(dk => {
          const sumVal = totalSumByKey(dk.key);
          const isHidden = hiddenKeys[dk.key];
          return (
            <div 
              key={dk.key}
              onClick={() => toggleKey(dk.key)}
              className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                isHidden 
                  ? "bg-slate-950/40 border-slate-800/40 opacity-40 hover:opacity-60" 
                  : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:shadow-inner"
              }`}
              id={`metric-key-${dk.key}`}
            >
              <div className="flex items-center gap-1.5 justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate max-w-[80%]">{dk.label}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dk.color }} />
              </div>
              <div className="text-sm font-bold font-mono text-white mt-1">
                {sumVal > 10000 ? formatCurrency(sumVal) : sumVal.toLocaleString()}
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5 block">{isHidden ? "Hidden - Click to Show" : "Total Plot Accumulation"}</span>
            </div>
          );
        })}

        <button
          onClick={exportToCSV}
          className="p-2.5 rounded-xl border border-dashed border-slate-800 bg-transparent text-xs hover:bg-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center gap-2 font-medium text-slate-400 hover:text-slate-100 col-span-2 md:col-span-1"
          id="btn-csv-export"
        >
          <TrendingUp className="w-3.5 h-3.5 rotate-90 text-emerald-500" />
          <span>Download CSV Data</span>
        </button>
      </div>
    </div>
  );
}


// ==========================================
// 2. PLANNER WIDGET (DYNAMIC FORMULAS)
// ==========================================
export function PlannerWidget({ title, description, sliders, metrics }: PlannerWidgetProps) {
  // Initialize values dictionary
  const initialValues = useMemo(() => {
    const vals: { [key: string]: number } = {};
    (sliders || []).forEach(slider => {
      vals[slider.key] = slider.defaultValue;
    });
    return vals;
  }, [sliders]);

  const [values, setValues] = useState<{ [key: string]: number }>(initialValues);

  const handleSliderChange = (key: string, val: number) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  // Evaluate the formulas using our secure sandbox regex compiler
  const evaluationResult = (formula: string) => {
    try {
      let sanitized = formula;
      const sortedKeys = Object.keys(values).sort((a, b) => b.length - a.length);
      
      sortedKeys.forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, "g");
        sanitized = sanitized.replace(regex, values[key].toString());
      });

      sanitized = sanitized.replace(/Math\.pow/g, "Math.pow");
      sanitized = sanitized.replace(/Math\.sqrt/g, "Math.sqrt");
      sanitized = sanitized.replace(/Math\.max/g, "Math.max");
      sanitized = sanitized.replace(/Math\.min/g, "Math.min");

      const isSafe = /^[0-9+\-*/().\s,]|(Math\.pow)|(Math\.sqrt)|(Math\.max)|(Math\.min)+$/.test(sanitized);
      if (!isSafe) {
        return "Unsafe Math";
      }

      const calcResult = new Function(`return (${sanitized});`)();
      return isNaN(calcResult) || calcResult === Infinity || calcResult === -Infinity ? 0 : calcResult;
    } catch {
      return "Math Error";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl my-4" id="planner-widget-box">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 mb-6" id="planner-header">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" id="planner-icon" />
          <h4 className="text-lg font-semibold tracking-tight text-white mb-0" id="planner-title">{title}</h4>
        </div>
        {description && <p className="text-xs text-slate-400 mt-1" id="planner-desc">{description}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="planner-grid-columns">
        {/* Left Side: Sliders */}
        <div className="space-y-5" id="planner-sliders-pane">
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 block">Adjust Inputs</h5>
          {sliders.map(slider => (
            <div key={slider.key} className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800" id={`slider-box-${slider.key}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">{slider.label}</span>
                <span className="font-mono text-indigo-400 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-900/60">
                  {slider.prefix}{values[slider.key]?.toLocaleString()}{slider.suffix}
                </span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={values[slider.key] !== undefined ? values[slider.key] : slider.defaultValue}
                onChange={(e) => handleSliderChange(slider.key, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                id={`slider-input-${slider.key}`}
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>{slider.prefix}{slider.min.toLocaleString()}{slider.suffix}</span>
                <span>{slider.prefix}{slider.max.toLocaleString()}{slider.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Side: Calculated Metrics Results */}
        <div className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between" id="planner-calculated-pane">
          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">Calculated Net Projection</h5>
            <div className="space-y-4" id="planner-metrics-list">
              {metrics.map((metric, idx) => {
                const computed = evaluationResult(metric.formula);
                const displayVal = typeof computed === "number" 
                  ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(computed)
                  : computed;

                return (
                  <div key={idx} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl" id={`computed-metric-box-${idx}`}>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{metric.label}</span>
                    <div className="text-xl font-extrabold font-mono text-slate-50 mt-1 flex items-baseline gap-1" id={`computed-metric-value-${idx}`}>
                      {metric.prefix && <span className="text-sm font-semibold text-indigo-400">{metric.prefix}</span>}
                      <span>{displayVal}</span>
                      {metric.suffix && <span className="text-xs font-semibold text-slate-400">{metric.suffix}</span>}
                    </div>
                    {metric.description && <p className="text-[10px] text-slate-500 mt-1" id={`computed-metric-desc-${idx}`}>{metric.description}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center gap-1.5 font-mono" id="planner-disclaimer">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Interactive reactive calculator sandbox models running locally</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// 3. CHECKLIST WIDGET
// ==========================================
export function ChecklistWidget({ title, categories: initialCategories }: ChecklistWidgetProps) {
  const [categories, setCategories] = useState(initialCategories || []);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemPriority, setNewItemPriority] = useState<"low"|"medium"|"high">("medium");

  const totalTasksCount = useMemo(() => {
    return categories.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [categories]);

  const completedTasksCount = useMemo(() => {
    return categories.reduce((acc, cat) => acc + cat.items.filter(i => i.completed).length, 0);
  }, [categories]);

  const completionPercentage = useMemo(() => {
    if (totalTasksCount === 0) return 0;
    return Math.round((completedTasksCount / totalTasksCount) * 100);
  }, [totalTasksCount, completedTasksCount]);

  const toggleTask = (catIdx: number, itemId: string) => {
    setCategories(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const cat = copy[catIdx];
      const item = cat.items.find((i: ChecklistItem) => i.id === itemId);
      if (item) item.completed = !item.completed;
      return copy;
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || categories.length === 0) return;

    setCategories(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const newItem: ChecklistItem = {
        id: `custom-chk-${Date.now()}`,
        name: newItemName.trim(),
        completed: false,
        priority: newItemPriority,
        desc: newItemDesc.trim() || undefined,
      };
      copy[activeCategoryIdx].items.push(newItem);
      return copy;
    });

    setNewItemName("");
    setNewItemDesc("");
  };

  const deleteTask = (catIdx: number, itemId: string) => {
    setCategories(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[catIdx].items = copy[catIdx].items.filter((i: ChecklistItem) => i.id !== itemId);
      return copy;
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl my-4" id="checklist-widget-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6" id="checklist-header">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" id="checklist-id-icon" />
            <h4 className="text-lg font-semibold tracking-tight text-white mb-0" id="checklist-widget-title">{title}</h4>
          </div>
          <p className="text-xs text-slate-400 mt-1" id="checklist-summary-text">
            Compiling and executing backlog checkpoints ({completedTasksCount}/{totalTasksCount} items done)
          </p>
        </div>

        {/* Progress Bar Gauge */}
        <div className="flex items-center gap-3 w-full md:w-48 select-none" id="checklist-progress-gauge">
          <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800" id="checklist-progress-bar-container">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              id="checklist-progress-fill"
            />
          </div>
          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-1.5 py-0.5 rounded" id="checklist-percentage-label">
            {completionPercentage}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="checklist-board">
        {/* Categories Tab Left Selector */}
        <div className="space-y-1.5" id="checklist-tabs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 block">Task Subcategories</span>
          {categories.map((cat, idx) => {
            const catCompleted = cat.items.filter(i => i.completed).length;
            const catTotal = cat.items.length;
            const isActive = activeCategoryIdx === idx;

            return (
              <button
                key={idx}
                onClick={() => setActiveCategoryIdx(idx)}
                className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${
                  isActive 
                    ? "bg-slate-800 border-slate-700 text-white shadow-sm" 
                    : "bg-slate-950 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                }`}
                id={`btn-checklist-category-${idx}`}
              >
                <span className="truncate pr-2">{cat.name}</span>
                <span className="font-mono text-[10px] bg-slate-900/80 border border-slate-800 rounded px-1 text-slate-400">
                  {catCompleted}/{catTotal}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Category Task Cards List */}
        <div className="md:col-span-2 space-y-3" id="checklist-items-pane">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            {categories[activeCategoryIdx]?.name || "Task List"}
          </span>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1" id="checklist-items-scroll-box">
            <AnimatePresence mode="popLayout">
              {categories[activeCategoryIdx]?.items.length === 0 ? (
                <div className="text-xs font-mono text-slate-500 py-6 text-center border border-dashed border-slate-800 rounded-xl" id="checklist-empty-prompt">
                  All milestones achieved! Add a custom checkpoint below.
                </div>
              ) : (
                categories[activeCategoryIdx]?.items.map(item => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={item.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      item.completed 
                        ? "bg-slate-950/40 border-slate-900/60 text-slate-400 opacity-60" 
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:shadow-md"
                    }`}
                    id={`chore-card-${item.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleTask(activeCategoryIdx, item.id)}
                      className="mt-1 w-4 h-4 cursor-pointer accent-emerald-500 border-slate-700 bg-slate-900 rounded"
                      id={`chkbox-${item.id}`}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h6 className={`text-xs font-semibold leading-tight truncate ${item.completed ? "line-through text-slate-500" : "text-white"}`} id={`chore-title-${item.id}`}>
                          {item.name}
                        </h6>
                        {item.priority && (
                          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold font-mono ${
                            item.priority === "high" ? "bg-rose-950 text-rose-300 border border-rose-900/40" :
                            item.priority === "medium" ? "bg-amber-950 text-amber-300 border border-amber-900/40" :
                            "bg-slate-900 text-slate-400 border border-slate-800"
                          }`} id={`chore-priority-${item.id}`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                      {item.desc && <p className="text-[10px] text-slate-400 mt-1 leading-normal" id={`chore-description-${item.id}`}>{item.desc}</p>}
                    </div>

                    <button
                      onClick={() => deleteTask(activeCategoryIdx, item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors self-center"
                      id={`btn-delete-chore-${item.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Quick Add Custom Checkpoint Form */}
          <form onSubmit={handleAddTask} className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2" id="checklist-add-form">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Submit final blueprints..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full text-xs bg-slate-950 rounded-xl border border-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                id="input-chore-title"
              />
            </div>
            <div className="flex gap-1.5">
              <select
                value={newItemPriority}
                onChange={(e) => setNewItemPriority(e.target.value as any)}
                className="bg-slate-950 text-xs rounded-xl border border-slate-800 px-2.5 py-2 text-slate-300 focus:outline-none focus:border-emerald-500"
                id="select-chore-priority"
              >
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
              </select>
              <button
                type="submit"
                disabled={!newItemName.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-50 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                id="btn-add-chore"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// 4. KANBAN WIDGET
// ==========================================
export function KanbanWidget({ title, columns: initialColumns }: KanbanWidgetProps) {
  const [columns, setColumns] = useState(initialColumns || []);
  const [addingToColId, setAddingToColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");

  const handleMove = (cardId: string, sourceColId: string, direction: "left" | "right") => {
    setColumns(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const sourceCol = copy.find((c: KanbanColumn) => c.id === sourceColId);
      if (!sourceCol) return prev;

      const cardIdx = sourceCol.tasks.findIndex((t: KanbanTask) => t.id === cardId);
      if (cardIdx === -1) return prev;

      const [cardToMove] = sourceCol.tasks.splice(cardIdx, 1);

      // Locate column indices
      const sourceIdx = copy.findIndex((c: KanbanColumn) => c.id === sourceColId);
      const targetIdx = direction === "left" ? sourceIdx - 1 : sourceIdx + 1;

      // Ensure index boundary logic is safe
      if (targetIdx >= 0 && targetIdx < copy.length) {
        copy[targetIdx].tasks.push(cardToMove);
        return copy;
      }
      
      // Put card back if logic fails
      sourceCol.tasks.splice(cardIdx, 0, cardToMove);
      return prev;
    });
  };

  const handleAddCard = (colId: string) => {
    if (!newCardTitle.trim()) return;

    setColumns(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const col = copy.find((c: KanbanColumn) => c.id === colId);
      if (col) {
        col.tasks.push({
          id: `kb-card-${Date.now()}`,
          title: newCardTitle.trim(),
          description: newCardDesc.trim() || undefined,
          tags: ["User Added"],
        });
      }
      return copy;
    });

    setNewCardTitle("");
    setNewCardDesc("");
    setAddingToColId(null);
  };

  const removeCard = (colId: string, cardId: string) => {
    setColumns(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const col = copy.find((c: KanbanColumn) => c.id === colId);
      if (col) {
        col.tasks = col.tasks.filter((t: KanbanTask) => t.id !== cardId);
      }
      return copy;
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-xl my-4 overflow-hidden" id="kanban-widget-box">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6" id="kanban-header">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-400" id="kanban-scrum-icon" />
          <h4 className="text-lg font-semibold tracking-tight text-white mb-0" id="kanban-title">{title}</h4>
        </div>
        <span className="text-[10px] bg-slate-950 border border-slate-800 font-mono px-2 py-0.5 rounded text-slate-400" id="kanban-scrum-counter">
          Interactive Scrum board
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto min-w-0" id="kanban-board-grid">
        {columns.map((column, colIdx) => (
          <div key={column.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col h-[280px]" id={`kanban-column-${column.id}`}>
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/60 text-xs text-slate-300 font-bold tracking-tight select-none">
              <span className="truncate max-w-[80%]">{column.title}</span>
              <span className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center font-mono text-[10px] font-bold text-indigo-400 border border-slate-800">
                {column.tasks.length}
              </span>
            </div>

            {/* Task Card List */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 scrollbar-thin max-h-[180px]" id={`kanban-scroll-${column.id}`}>
              <AnimatePresence mode="popLayout">
                {column.tasks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] font-mono text-slate-600 text-center py-6 border border-dashed border-slate-900 rounded-xl">
                    Lane unoccupied
                  </div>
                ) : (
                  column.tasks.map(task => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={task.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3 rounded-xl shadow-sm space-y-2 group"
                      id={`kanban-task-${task.id}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-semibold text-white tracking-tight leading-snug truncate max-w-[85%]">{task.title}</span>
                        <button
                          onClick={() => removeCard(column.id, task.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 rounded hover:bg-slate-950 transition-all self-start"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {task.description && <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">{task.description}</p>}

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map(tag => (
                            <span key={tag} className="text-[9px] bg-indigo-950/60 border border-indigo-900/40 text-indigo-300 font-bold font-mono px-1.5 py-0.2 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Direction Movements Controllers */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                        {colIdx > 0 ? (
                          <button
                            onClick={() => handleMove(task.id, column.id, "left")}
                            className="p-1 rounded text-slate-500 hover:text-indigo-400 hover:bg-slate-950 transition-colors"
                            id={`move-left-${task.id}`}
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        ) : <div />}
                        {colIdx < columns.length - 1 ? (
                          <button
                            onClick={() => handleMove(task.id, column.id, "right")}
                            className="p-1 rounded text-slate-500 hover:text-indigo-400 hover:bg-slate-950 transition-colors"
                            id={`move-right-${task.id}`}
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : <div />}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Quick Card Launcher At Bottom */}
            {addingToColId === column.id ? (
              <div className="mt-2 pt-2 border-t border-slate-800 grid gap-1.5" id={`adding-form-${column.id}`}>
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  className="w-full text-[10px] bg-slate-900 rounded border border-slate-800 px-2 py-1 text-slate-100 placeholder-slate-500"
                  id={`kb-inp-title-${column.id}`}
                />
                <input
                  type="text"
                  placeholder="Description..."
                  value={newCardDesc}
                  onChange={(e) => setNewCardDesc(e.target.value)}
                  className="w-full text-[10px] bg-slate-900 rounded border border-slate-800 px-2 py-1 text-slate-100 placeholder-slate-500"
                  id={`kb-inp-desc-${column.id}`}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAddCard(column.id)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-slate-50 py-1 rounded text-[9px] font-semibold"
                    id={`kb-save-card-${column.id}`}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setAddingToColId(null)}
                    className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 py-1 rounded text-[9px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingToColId(column.id)}
                className="mt-2 pt-2 border-t border-dashed border-slate-800 hover:bg-slate-900 text-slate-500 hover:text-slate-300 w-full rounded flex items-center justify-center gap-1 text-[10px] py-1 transition-colors font-medium cursor-pointer"
                id={`btn-open-add-kb-${column.id}`}
              >
                <Plus className="w-3 h-3" />
                <span>Add Task</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ==========================================
// 5. COMPARISON MATRIX
// ==========================================
export function ComparisonWidget({ title, columns, rows }: ComparisonWidgetProps) {
  const [rowWeights, setRowWeights] = useState<{ [key: string]: number }>(() => {
    const weights: { [key: string]: number } = {};
    rows.forEach(row => {
      weights[row.id] = 5; // Default score weight
    });
    return weights;
  });

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const handleWeightChange = (rowId: string, val: number) => {
    setRowWeights(prev => ({ ...prev, [rowId]: val }));
  };

  const sortedMatrixRows = useMemo(() => {
    return [...rows].map(row => {
      const baseSimplicity = row.values.simplicity !== undefined ? Number(row.values.simplicity) : 5;
      const adjustWeight = rowWeights[row.id] !== undefined ? rowWeights[row.id] : 5;
      const calculatedScore = Math.min(10, Math.round(((baseSimplicity * 0.6) + (adjustWeight * 0.4)) * 10) / 10);
      return {
        ...row,
        simplicityScore: baseSimplicity,
        weightOffset: adjustWeight,
        finalScore: calculatedScore,
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }, [rows, rowWeights]);

  const toggleRowExpand = (rowId: string) => {
    setExpandedRowId(prev => prev === rowId ? null : rowId);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl my-4" id="matrix-widget-box">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="matrix-header">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400 rotate-90" id="matrix-icon" />
            <h4 className="text-lg font-semibold tracking-tight text-white mb-0" id="matrix-title">{title}</h4>
          </div>
          <p className="text-xs text-slate-400 mt-1" id="matrix-desc">
            Rate custom features live inside columns to recalculate provider suitability rankings
          </p>
        </div>
        <span className="text-[10px] bg-slate-950 border border-slate-800 font-mono px-2.5 py-1 rounded text-indigo-400 h-fit" id="matrix-score-indicator">
          Rank Score Weighted Live
        </span>
      </div>

      {/* Responsive Matrix Grid */}
      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950" id="matrix-grid-frame">
        <table className="w-full text-left border-collapse" id="matrix-table-node">
          <thead>
            <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4">Rank #</th>
              {columns.map(col => (
                <th key={col.key} className="py-3.5 px-4">{col.label}</th>
              ))}
              <th className="py-3.5 px-4 text-indigo-400">Weight Factor (1-10)</th>
              <th className="py-3.5 px-4 text-right">Weighted score</th>
              <th className="py-3.5 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {sortedMatrixRows.map((row, idx) => {
              const rankIcon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
              const isExpanded = expandedRowId === row.id;

              return (
                <Fragment key={row.id}>
                  <tr 
                    onClick={() => toggleRowExpand(row.id)}
                    className={`hover:bg-slate-900/40 cursor-pointer transition-all ${
                      idx === 0 ? "bg-indigo-950/20 border-l-2 border-l-emerald-500" : ""
                    }`}
                    id={`matrix-row-${row.id}`}
                  >
                    <td className="py-4 px-4 font-bold font-mono">
                      <span className="mr-1">{rankIcon}</span>
                      <span>#{idx + 1}</span>
                    </td>
                    {columns.map(col => {
                      const val = row.values[col.key];
                      return (
                        <td key={col.key} className="py-4 px-4 text-slate-200">
                          {col.key === "simplicity" ? (
                            <span className="bg-slate-900 border border-slate-800 rounded font-mono px-1.5 py-0.5 text-indigo-300 font-bold">
                              {val} / 10
                            </span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 max-w-xs">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={rowWeights[row.id] !== undefined ? rowWeights[row.id] : 5}
                          onChange={(e) => handleWeightChange(row.id, parseInt(e.target.value))}
                          className="w-20 sm:w-28 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                          id={`matrix-slider-${row.id}`}
                        />
                        <span className="font-mono text-[10px] font-bold bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 min-w-5 text-center">
                          {rowWeights[row.id] !== undefined ? rowWeights[row.id] : 5}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold font-mono text-white text-sm" id={`matrix-row-score-${row.id}`}>
                      {row.finalScore} / 10
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </td>
                  </tr>

                  {/* Collapse Slider details */}
                  {isExpanded && (
                    <tr className="bg-slate-900/10">
                      <td colSpan={columns.length + 4} className="py-3.5 px-6 border-b border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400 font-normal">
                          <div>
                            <span className="font-semibold text-slate-300 block mb-1">Interactive Indexing Parameter weights:</span>
                            <p className="leading-relaxed">
                              This weighted score combines the vendor’s static efficiency index (60% weight) and your manual custom priority slider value (40% weight). Slide to prioritize vendors based on budget and urgency!
                            </p>
                          </div>
                          <div className="flex flex-col justify-center gap-1 border-l border-slate-800 pl-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Calculated Formulation:</span>
                            <code className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] font-mono text-emerald-400 leading-normal block">
                              Score = ({row.simplicityScore} * 0.6) + ({row.weightOffset} * 0.4) = {row.finalScore}
                            </code>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
