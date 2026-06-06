/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  modelUsed?: string;
  isSandboxResponse?: boolean;
}

export interface ChartDataKey {
  key: string;
  label: string;
  color: string;
}

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface ChartWidgetProps {
  type: "line" | "bar" | "area" | "pie" | "composed";
  title: string;
  description?: string;
  xAxisKey?: string;
  dataKeys: ChartDataKey[];
  data: ChartDataPoint[];
}

export interface SliderParam {
  key: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  step: number;
  prefix?: string;
  suffix?: string;
}

export interface MetricParam {
  label: string;
  formula: string;
  prefix?: string;
  suffix?: string;
  description?: string;
}

export interface PlannerWidgetProps {
  title: string;
  description?: string;
  sliders: SliderParam[];
  metrics: MetricParam[];
}

export interface ChecklistItem {
  id: string;
  name: string;
  completed: boolean;
  priority?: "low" | "medium" | "high";
  desc?: string;
}

export interface ChecklistCategory {
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistWidgetProps {
  title: string;
  categories: ChecklistCategory[];
}

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  tasks: KanbanTask[];
}

export interface KanbanWidgetProps {
  title: string;
  columns: KanbanColumn[];
}

export interface ComparisonRow {
  id: string;
  values: {
    [key: string]: any;
  };
}

export interface ComparisonColumn {
  key: string;
  label: string;
}

export interface ComparisonWidgetProps {
  title: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}
