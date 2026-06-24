import type { DashboardConfig, DimensionConfig } from "@/lib/dashboardTypes";

export const DIMENSIONS: DimensionConfig[] = [
  { id: "region", label: "Region", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "category", label: "Category", maxVisibleItems: 12, pieThreshold: 7 },
  { id: "product", label: "Product", maxVisibleItems: 6, pieThreshold: 8 },
  { id: "channel", label: "Channel", maxVisibleItems: 6, pieThreshold: 7 },
  { id: "segment", label: "Customer Segment", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "status", label: "Status", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "quarter", label: "Quarter", maxVisibleItems: 12, pieThreshold: 8 },
  { id: "owner", label: "Account Owner", maxVisibleItems: 6, pieThreshold: 6 },
];

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  dimensions: DIMENSIONS,
  metrics: [
    {
      id: "rows",
      label: "Rows in scope",
      kind: "count",
      detail: "of all rows",
      format: "number",
    },
    {
      id: "revenue",
      label: "Revenue",
      kind: "sum",
      field: "revenue",
      detail: "filtered total",
      format: "currency",
    },
    {
      id: "units",
      label: "Units",
      kind: "sum",
      field: "units",
      detail: "filtered total",
      format: "compact",
    },
    {
      id: "satisfaction",
      label: "Satisfaction",
      kind: "average",
      field: "satisfaction",
      detail: "average score",
      format: "decimal",
    },
  ],
};

export const CHART_COLORS = [
  "#2563eb",
  "#0f766e",
  "#c2410c",
  "#7c3aed",
  "#be123c",
  "#15803d",
  "#b45309",
  "#0369a1",
  "#a21caf",
  "#4d7c0f",
  "#4338ca",
  "#a16207",
];
