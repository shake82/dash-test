export type DataRow = Record<string, unknown>;

export type DimensionId = string;

export type MetricId = string;

export type DimensionLookup =
  | Record<string, string>
  | ((value: string) => string | null | undefined);

export type DimensionConfig = {
  id: DimensionId;
  label: string;
  field?: string;
  lookup?: DimensionLookup;
  maxVisibleItems: number;
  pieThreshold: number;
};

export type MetricFormat = "compact" | "currency" | "decimal" | "number" | "percent";

export type MetricConfig = {
  id: MetricId;
  label: string;
  kind: "average" | "count" | "sum";
  field?: string;
  detail?: string;
  format?: MetricFormat;
};

export type DashboardConfig = {
  dimensions: DimensionConfig[];
  metrics: MetricConfig[];
};

export type SerializableDimensionConfig = Omit<DimensionConfig, "lookup"> & {
  lookup?: Record<string, string>;
};

export type SerializableDashboardConfig = {
  dimensions: SerializableDimensionConfig[];
  metrics: MetricConfig[];
};

export type ChartDatum = {
  key: string;
  label: string;
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

export type DashboardMetricValue = MetricConfig & {
  value: number;
};

export type DashboardMetrics = {
  totalRows: number;
  filteredRows: number;
  values: DashboardMetricValue[];
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
  | { type: "load"; url: string; jsonPath: string; config: SerializableDashboardConfig }
  | { type: "toggleFilter"; dimensionId: DimensionId; value: string }
  | { type: "clearFilter"; dimensionId: DimensionId }
  | { type: "clearAllFilters" };
