import type {
  ChartDatum,
  ChartType,
  DashboardConfig,
  DashboardMetrics,
  DimensionConfig,
  DimensionMeasure,
  DimensionSummary,
  InitialDimensionAggregate,
  WorkerStatePayload,
} from "@/lib/dashboardTypes";

const AGGREGATE_LABEL = "Others";

const defaultDimensionMeasure: NonNullable<DashboardConfig["dimensionMeasure"]> = {
  kind: "count",
  label: "rows",
};

export function createInitialDashboardState(
  rows: InitialDimensionAggregate[],
  config: DashboardConfig,
): WorkerStatePayload {
  const dimensions = config.dimensions.map((dimensionConfig) =>
    createDimensionSummary(rows, dimensionConfig, config.dimensionMeasure),
  );
  const measuredTotal = Math.max(0, ...dimensions.map((dimension) => dimension.totalCount));

  return {
    activeFilters: {},
    dimensions,
    metrics: createInitialMetrics(config, measuredTotal),
  };
}

export function parseInitialDimensionAggregates(value: unknown): InitialDimensionAggregate[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected initial dashboard state to be an array.");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Expected preview row ${index + 1} to be an object.`);
    }

    const row = item as Record<string, unknown>;
    const aggregate = Number(row.aggregate);

    if (typeof row.id !== "string" || !row.id) {
      throw new Error(`Expected preview row ${index + 1} to include a dimension id.`);
    }

    if (!Number.isFinite(aggregate)) {
      throw new Error(`Expected preview row ${index + 1} to include a numeric aggregate.`);
    }

    return {
      id: row.id,
      value: normalizeValue(row.value),
      aggregate,
    };
  });
}

function createDimensionSummary(
  rows: InitialDimensionAggregate[],
  config: DimensionConfig,
  dimensionMeasure: DimensionMeasure | undefined,
): DimensionSummary {
  const valueByKey = new Map<string, number>();

  for (const row of rows) {
    if (row.id !== config.id || row.aggregate <= 0) {
      continue;
    }

    const key = valueForDimensionAggregate(row.value, config);
    valueByKey.set(key, (valueByKey.get(key) ?? 0) + row.aggregate);
  }

  const groupedValues = [...valueByKey]
    .map(([key, value]) => ({ key, label: getLookupLabel(key, config), value }))
    .sort((a, b) => sortDimensionItems(a, b, config));

  const chartType = getChartType(config, groupedValues.length);
  const totalCount = groupedValues.reduce((sum, item) => sum + item.value, 0);
  const visibleLimit = Math.max(1, config.maxVisibleItems);
  const allValues = groupedValues.map((item, index) =>
    toChartDatum(item, totalCount, index),
  );
  const values = getVisibleValues(allValues, chartType, totalCount, visibleLimit);
  const hiddenCount = chartType === "bar" ? Math.max(0, allValues.length - visibleLimit) : 0;

  return {
    ...config,
    chartType,
    cardinality: allValues.length,
    visibleCount: values.length,
    hiddenCount,
    totalCount,
    valueLabel: getDimensionValueLabel(dimensionMeasure),
    values,
    allValues,
  };
}

function createInitialMetrics(
  config: DashboardConfig,
  measuredTotal: number,
): DashboardMetrics {
  const measure = config.dimensionMeasure ?? defaultDimensionMeasure;

  return {
    totalRows: measuredTotal,
    filteredRows: measuredTotal,
    values: config.metrics.flatMap((metric) => {
      const value =
        metric.kind === "count" && measure.kind === "count"
          ? measuredTotal
          : metric.kind === "totalSum" && measure.kind === "sum" && metric.field === measure.field
            ? measuredTotal
          : metric.kind === "sum" && measure.kind === "sum" && metric.field === measure.field
            ? measuredTotal
            : metric.kind === "filteredPercent" && measure.kind === "sum" && metric.field === measure.field
              ? measuredTotal ? 1 : 0
            : null;

      if (value === null) {
        return [];
      }

      return [{
        ...metric,
        value,
      }];
    }),
  };
}

function toChartDatum(
  item: { key: string; label: string; value: number },
  totalCount: number,
  colorIndex: number,
): ChartDatum {
  return {
    key: item.key,
    label: item.label,
    value: item.value,
    share: totalCount ? item.value / totalCount : 0,
    selected: false,
    colorIndex,
  };
}

function getVisibleValues(
  allValues: ChartDatum[],
  chartType: ChartType,
  totalCount: number,
  visibleLimit: number,
) {
  if (chartType !== "bar" || allValues.length <= visibleLimit) {
    return allValues;
  }

  const topValues = allValues.slice(0, visibleLimit);
  const aggregatedValues = allValues.slice(visibleLimit);
  const aggregateValue = aggregatedValues.reduce((sum, item) => sum + item.value, 0);

  return [
    ...topValues,
    {
      key: AGGREGATE_LABEL,
      label: AGGREGATE_LABEL,
      value: aggregateValue,
      share: totalCount ? aggregateValue / totalCount : 0,
      selected: false,
      isAggregate: true,
      aggregateCount: aggregatedValues.length,
    },
  ];
}

function getLookupLabel(value: string, dimensionConfig: DimensionConfig) {
  const { lookup } = dimensionConfig;

  if (!lookup) {
    return getFormattedLabel(value, dimensionConfig);
  }

  if (typeof lookup === "function") {
    return lookup(value) ?? getFormattedLabel(value, dimensionConfig);
  }

  return lookup[value] ?? getFormattedLabel(value, dimensionConfig);
}

function getFormattedLabel(value: string, dimensionConfig: DimensionConfig) {
  if (dimensionConfig.labelFormat === "mm-yyyy") {
    return formatMonthYearLabel(value);
  }

  return value;
}

function getChartType(config: DimensionConfig, valueCount: number): ChartType {
  return config.chartType ?? (valueCount <= config.pieThreshold ? "pie" : "bar");
}

function sortDimensionItems(
  a: { key: string; label: string; value: number },
  b: { key: string; label: string; value: number },
  config: DimensionConfig,
) {
  if (config.sort === "dateAsc" || config.aggregation === "month") {
    return a.key.localeCompare(b.key) || a.label.localeCompare(b.label);
  }

  const byValue = b.value - a.value;
  return byValue || a.label.localeCompare(b.label) || a.key.localeCompare(b.key);
}

function getDimensionValueLabel(dimensionMeasure: DimensionMeasure | undefined) {
  const measure = dimensionMeasure ?? defaultDimensionMeasure;

  if (measure.label) {
    return measure.label;
  }

  return measure.kind === "sum" ? measure.field : "rows";
}

function normalizeValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
}

function valueForDimensionAggregate(value: string, config: DimensionConfig) {
  if (config.aggregation === "month") {
    return toMonthKey(value);
  }

  return value;
}

function toMonthKey(value: unknown) {
  const normalized = normalizeValue(value);
  const match = normalized.match(/^(\d{4})-(\d{2})/);

  if (match) {
    return `${match[1]}-${match[2]}`;
  }

  return normalized;
}

function formatMonthYearLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return value;
  }

  return `${match[2]}-${match[1]}`;
}
