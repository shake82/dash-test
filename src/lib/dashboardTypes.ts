export type DataRow = {
  id: string;
  region: string;
  category: string;
  product: string;
  channel: string;
  segment: string;
  status: string;
  quarter: string;
  owner: string;
  revenue: number;
  units: number;
  satisfaction: number;
};

export type DimensionId =
  | "region"
  | "category"
  | "product"
  | "channel"
  | "segment"
  | "status"
  | "quarter"
  | "owner";

export type DimensionConfig = {
  id: DimensionId;
  label: string;
  maxVisibleItems: number;
  pieThreshold: number;
};

export type ChartDatum = {
  key: string;
  value: number;
  share: number;
  selected: boolean;
  isAggregate?: boolean;
  aggregateCount?: number;
};

export type DimensionSummary = DimensionConfig & {
  chartType: "bar" | "pie";
  cardinality: number;
  visibleCount: number;
  hiddenCount: number;
  totalCount: number;
  values: ChartDatum[];
  allValues: ChartDatum[];
};

export type ActiveFilters = Partial<Record<DimensionId, string[]>>;

export type DashboardMetrics = {
  totalRows: number;
  filteredRows: number;
  revenue: number;
  units: number;
  averageSatisfaction: number;
};

export type WorkerLoadProgress = {
  receivedBytes: number;
  totalBytes: number | null;
  percent: number | null;
  stage: "connecting" | "downloading" | "parsing" | "indexing" | "ready";
};

export type WorkerStatePayload = {
  activeFilters: ActiveFilters;
  dimensions: DimensionSummary[];
  metrics: DashboardMetrics;
};

export type DashboardWorkerOutMessage =
  | { type: "progress"; payload: WorkerLoadProgress }
  | { type: "ready"; payload: WorkerStatePayload }
  | { type: "state"; payload: WorkerStatePayload }
  | { type: "error"; payload: { message: string } };

export type DashboardWorkerInMessage =
  | { type: "load"; url: string; jsonPath: string }
  | { type: "toggleFilter"; dimensionId: DimensionId; value: string }
  | { type: "clearFilter"; dimensionId: DimensionId }
  | { type: "clearAllFilters" };
