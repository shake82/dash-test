import type { DimensionConfig } from "@/lib/dashboardTypes";

export const DIMENSIONS: DimensionConfig[] = [
  { id: "region", label: "Region", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "category", label: "Category", maxVisibleItems: 12, pieThreshold: 7 },
  { id: "product", label: "Product", maxVisibleItems: 20, pieThreshold: 8 },
  { id: "channel", label: "Channel", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "segment", label: "Customer Segment", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "status", label: "Status", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "quarter", label: "Quarter", maxVisibleItems: 12, pieThreshold: 8 },
  { id: "owner", label: "Account Owner", maxVisibleItems: 24, pieThreshold: 6 },
];

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
