import type { DashboardConfig, DimensionConfig } from "@/lib/dashboardTypes";

const yesNLookup =  (v: string)=> v=== 'Y'? 'Yes': 'No'

export const DIMENSIONS: DimensionConfig[] = [
  { id: "currentLocationCode", label: "Current Location Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "fcoLocationCode", label: "FCO Location Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "adjudicationLocationCode", label: "Adjudication Location Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "caseSubstatusCode", label: "Case Substatus Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "filingCategoryCode", label: "Filing Category Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "atNBC", label: "At NBC", maxVisibleItems: 2, pieThreshold: 7 ,lookup: yesNLookup },
  { id: "milnatzInd", label: "MILNATZ Indicator", maxVisibleItems: 2, pieThreshold: 7 ,lookup: yesNLookup },
  { id: "uscisReceiptDate", label: "USCIS Receipt Date", maxVisibleItems: 12, pieThreshold: 8 },
  { id: "channelTypeCode", label: "Channel Type Code", maxVisibleItems: 10, pieThreshold: 7 },
  { id: "isRemoteInd", label: "Remote Indicator", maxVisibleItems: 2, pieThreshold: 7, lookup: yesNLookup  },
];

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  dimensions: DIMENSIONS,
  dimensionMeasure: { kind: "count", label: "rows" },
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
