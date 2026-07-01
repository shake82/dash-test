export type DataRow = Record<string, unknown>;

export type DimensionId = string;

export type MetricId = string;

export type DimensionLookup =
  | Record<string, string>
  | ((value: string) => string | null | undefined);

export type ChartType = "area" | "bar" | "pie";

export type DimensionConfig = {
  id: DimensionId;
  label: string;
  field?: string;
  aggregation?: "month";
  chartType?: ChartType;
  labelFormat?: "mm-yyyy";
  lookup?: DimensionLookup;
  maxVisibleItems: number;
  pieThreshold: number;
  sort?: "aggregateDesc" | "dateAsc";
};

export type MetricFormat = "compact" | "currency" | "decimal" | "number" | "percent";

export type MetricConfig = {
  id: MetricId;
  label: string;
  kind: "average" | "count" | "filteredPercent" | "sum" | "totalSum";
  field?: string;
  detail?: string;
  format?: MetricFormat;
};

export type DimensionMeasure =
  | {
      kind: "count";
      label?: string;
    }
  | {
      kind: "sum";
      field: string;
      label?: string;
    };

export type DashboardConfig = {
  dimensions: DimensionConfig[];
  dimensionMeasure?: DimensionMeasure;
  metrics: MetricConfig[];
};

export type InitialDimensionAggregate = {
  id: DimensionId;
  value: string;
  aggregate: number;
};

export type SerializableDimensionConfig = Omit<DimensionConfig, "lookup"> & {
  hasLookupFunction?: boolean;
  lookup?: Record<string, string>;
};

export type SerializableDashboardConfig = {
  dimensions: SerializableDimensionConfig[];
  dimensionMeasure?: DimensionMeasure;
  metrics: MetricConfig[];
};

export type ChartDatum = {
  key: string;
  label: string;
  value: number;
  share: number;
  selected: boolean;
  colorIndex?: number;
  isAggregate?: boolean;
  aggregateCount?: number;
};

export type DimensionSummary = DimensionConfig & {
  chartType: ChartType;
  cardinality: number;
  visibleCount: number;
  hiddenCount: number;
  totalCount: number;
  valueLabel: string;
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
