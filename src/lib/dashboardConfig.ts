import type { DashboardConfig, DimensionConfig } from "@/lib/dashboardTypes";

const yesNLookup =  (v: string)=> v=== 'Y'? 'Yes': 'No'

export const DIMENSIONS: DimensionConfig[] = [
  { id: "currentLocationCode", label: "Current Location Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "fcoLocationCode", label: "FCO Location Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "adjudicationLocationCode", label: "Adjudication Location Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "caseSubstatusCode", label: "Case Substatus Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "filingCategoryCode", label: "Filing Category Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "channelTypeCode", label: "Channel Type Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "atNBC", label: "At NBC", maxVisibleItems: 2, pieThreshold: 7 ,lookup: yesNLookup },
  { id: "milnatzInd", label: "MILNATZ Indicator", maxVisibleItems: 2, pieThreshold: 7 ,lookup: yesNLookup },
  { id: "isRemoteInd", label: "Remote Indicator", maxVisibleItems: 2, pieThreshold: 7, lookup: yesNLookup  },
  { id: "uscisReceiptDate", label: "USCIS Receipt Date", maxVisibleItems: 12, pieThreshold: 8 },
];

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  dimensions: DIMENSIONS,
  dimensionMeasure: { kind: "sum", field: "total", label: "total" },
  metrics: [
    {
      id: "totalItems",
      label: "Total Items",
      kind: "totalSum",
      field: "total",
      detail: "all items",
      format: "number",
    },
    {
      id: "totalFiltered",
      label: "Total Filtered",
      kind: "sum",
      field: "total",
      detail: "selected items",
      format: "number",
    },
    {
      id: "percentSelected",
      label: "Percentage Selected",
      kind: "filteredPercent",
      field: "total",
      detail: "of all items",
      format: "percent",
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
