import crossfilter from "crossfilter2";
import type {
  ActiveFilters,
  ChartDatum,
  DashboardMetrics,
  DashboardWorkerInMessage,
  DashboardWorkerOutMessage,
  DataRow,
  DimensionId,
  DimensionSummary,
  SerializableDashboardConfig,
} from "@/lib/dashboardTypes";

type DimensionHandle = {
  id: DimensionId;
  dimension: crossfilter.Dimension<DataRow, string>;
  group: crossfilter.Group<DataRow, string, number>;
  colorIndexByValue: Map<string, number>;
};

type MetricAccumulator = {
  count: number;
  sums: Record<string, number>;
};

type LookupDef = Record<string, string>;
type LookupMap = Record<string, LookupDef>;

const AGGREGATE_LABEL = "Others";
const LOOKUP_URL = "/api/lookup.json";

let cf: crossfilter.Crossfilter<DataRow> | null = null;
let handles = new Map<DimensionId, DimensionHandle>();
let metricGroup: crossfilter.GroupAll<DataRow, MetricAccumulator> | null = null;
let totalRows = 0;
let currentConfig: SerializableDashboardConfig = { dimensions: [], metrics: [] };
let lookupMap: LookupMap = {};
const activeFilters = new Map<DimensionId, Set<string>>();
const defaultDimensionMeasure: NonNullable<SerializableDashboardConfig["dimensionMeasure"]> = {
  kind: "count",
  label: "rows",
};

const send = (message: DashboardWorkerOutMessage) => {
  self.postMessage(message);
};

const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
};

const valueForDimension = (
  row: DataRow,
  config: SerializableDashboardConfig["dimensions"][number],
) => {
  return normalizeValue(row[config.field ?? config.id]);
};

const labelForDimensionValue = (
  value: string,
  config: SerializableDashboardConfig["dimensions"][number],
) => {
  const configuredLabel = config.lookup?.[value];

  if (configuredLabel !== undefined) {
    return configuredLabel;
  }

  if (config.hasLookupFunction) {
    return value;
  }

  return getLookupMapLabel(value, config) ?? value;
};

const getLookupMapLabel = (
  value: string,
  config: SerializableDashboardConfig["dimensions"][number],
) => {
  return getLookupDef(config)?.[value];
};

const getLookupDef = (
  config: SerializableDashboardConfig["dimensions"][number],
) => {
  for (const key of getLookupKeys(config)) {
    const lookup = lookupMap[key];

    if (lookup) {
      return lookup;
    }
  }

  return undefined;
};

const getLookupKeys = (
  config: SerializableDashboardConfig["dimensions"][number],
) => {
  const sourceKey = config.field ?? config.id;
  const keys = [config.id, sourceKey];

  for (const key of [...keys]) {
    if (key.endsWith("Code")) {
      keys.push(`${key}s`);
    }

    if (key.endsWith("LocationCode")) {
      keys.push("locationCodes");
    }
  }

  return [...new Set(keys)];
};

const readLookupMap = async (url = LOOKUP_URL): Promise<LookupMap> => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {};
    }

    return parseLookupMap(await response.json());
  } catch {
    return {};
  }
};

const parseLookupMap = (value: unknown): LookupMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([lookupKey, lookupValue]) => {
      if (!lookupValue || typeof lookupValue !== "object" || Array.isArray(lookupValue)) {
        return [];
      }

      const lookup = Object.fromEntries(
        Object.entries(lookupValue as Record<string, unknown>).flatMap(([key, label]) => {
          return typeof label === "string" ? [[key, label]] : [];
        }),
      );

      return Object.keys(lookup).length ? [[lookupKey, lookup]] : [];
    }),
  );
};

const numberForMetric = (row: DataRow, field?: string) => {
  if (!field) {
    return 0;
  }

  const value = Number(row[field]);
  return Number.isFinite(value) ? value : 0;
};

const getDimensionMeasure = () => currentConfig.dimensionMeasure ?? defaultDimensionMeasure;

const getDimensionValueLabel = () => {
  const measure = getDimensionMeasure();

  if (measure.label) {
    return measure.label;
  }

  return measure.kind === "sum" ? measure.field : "rows";
};

const numberForDimensionMeasure = (row: DataRow) => {
  const measure = getDimensionMeasure();

  if (measure.kind === "count") {
    return 1;
  }

  return numberForMetric(row, measure.field);
};

const parseJsonPath = (jsonPath: string) => {
  const trimmedPath = jsonPath.trim();

  if (!trimmedPath || trimmedPath === "." || trimmedPath === "$") {
    return [];
  }

  const pathWithoutRoot = trimmedPath
    .replace(/^\$\./, "")
    .replace(/^\./, "")
    .replace(/\[(\d+)\]/g, ".$1");

  return pathWithoutRoot.split(".").filter(Boolean);
};

const resolveJsonPath = (value: unknown, jsonPath: string) => {
  return parseJsonPath(jsonPath).reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      return current[Number(segment)];
    }

    if (typeof current === "object") {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, value);
};

const readDataset = async (url: string, jsonPath: string) => {
  send({
    type: "progress",
    payload: {
      receivedBytes: 0,
      totalBytes: null,
      percent: null,
      stage: "connecting",
    },
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Dataset request failed with ${response.status}`);
  }

  const totalHeader = response.headers.get("content-length");
  const totalBytes = totalHeader ? Number(totalHeader) : null;

  if (!response.body) {
    const json = await response.json();
    const rows = resolveJsonPath(json, jsonPath);

    if (!Array.isArray(rows)) {
      throw new Error(`Expected an array at JSON path "${jsonPath}".`);
    }

    return rows as DataRow[];
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    receivedBytes += value.byteLength;

    send({
      type: "progress",
      payload: {
        receivedBytes,
        totalBytes,
        percent: totalBytes
          ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100))
          : null,
        stage: "downloading",
      },
    });
  }

  send({
    type: "progress",
    payload: {
      receivedBytes,
      totalBytes,
      percent: totalBytes ? 99 : null,
      stage: "parsing",
    },
  });

  const merged = new Uint8Array(receivedBytes);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const json = JSON.parse(new TextDecoder().decode(merged));
  const rows = resolveJsonPath(json, jsonPath);

  if (!Array.isArray(rows)) {
    throw new Error(`Expected an array at JSON path "${jsonPath}".`);
  }

  return rows as DataRow[];
};

const createMetricAccumulator = (): MetricAccumulator => ({
  count: 0,
  sums: Object.fromEntries(
    currentConfig.metrics
      .filter((metric) => metric.kind !== "count")
      .map((metric) => [metric.id, 0]),
  ),
});

const updateMetricAccumulator = (
  state: MetricAccumulator,
  row: DataRow,
  direction: 1 | -1,
): MetricAccumulator => {
  const sums = { ...state.sums };

  for (const metric of currentConfig.metrics) {
    if (metric.kind === "count") {
      continue;
    }

    sums[metric.id] = (sums[metric.id] ?? 0) + numberForMetric(row, metric.field) * direction;
  }

  return {
    count: state.count + direction,
    sums,
  };
};

const initializeCrossfilter = (rows: DataRow[], config: SerializableDashboardConfig) => {
  activeFilters.clear();
  handles = new Map();
  totalRows = rows.length;
  currentConfig = config;
  cf = crossfilter(rows);

  for (const config of currentConfig.dimensions) {
    const dimension = cf.dimension((row) => valueForDimension(row, config));
    const group =
      getDimensionMeasure().kind === "sum"
        ? dimension.group<string, number>().reduceSum(numberForDimensionMeasure)
        : dimension.group<string, number>().reduceCount();
    const colorIndexByValue = getInitialColorIndexByValue(group, config);
    handles.set(config.id, { id: config.id, dimension, group, colorIndexByValue });
  }

  metricGroup = cf.groupAll<MetricAccumulator>().reduce(
    (state, row) => updateMetricAccumulator(state, row, 1),
    (state, row) => updateMetricAccumulator(state, row, -1),
    createMetricAccumulator,
  );
};

const getInitialColorIndexByValue = (
  group: crossfilter.Group<DataRow, string, number>,
  config: SerializableDashboardConfig["dimensions"][number],
) => {
  return new Map(
    group
      .all()
      .filter((item) => item.value > 0)
      .map((item) => {
        const key = String(item.key);
        return { key, label: labelForDimensionValue(key, config), value: item.value };
      })
      .sort((a, b) => {
        const byValue = b.value - a.value;
        return byValue || a.label.localeCompare(b.label) || a.key.localeCompare(b.key);
      })
      .map((item, index) => [item.key, index]),
  );
};

const applyFilters = () => {
  for (const [id, handle] of handles) {
    const selected = activeFilters.get(id);
    handle.dimension.filterAll();

    if (!selected || selected.size === 0) {
      continue;
    }

    if (selected.size === 1) {
      handle.dimension.filterExact([...selected][0]);
      continue;
    }

    handle.dimension.filterFunction((value) => selected.has(value));
  }
};

const serializeFilters = () => {
  const filters: ActiveFilters = {};

  for (const [id, values] of activeFilters) {
    if (values.size > 0) {
      filters[id] = [...values].sort((a, b) => a.localeCompare(b));
    }
  }

  return filters;
};

const getMetrics = (): DashboardMetrics => {
  const value = metricGroup?.value() ?? {
    count: 0,
    sums: {},
  };

  return {
    totalRows,
    filteredRows: value.count,
    values: currentConfig.metrics.map((metric) => {
      const metricValue =
        metric.kind === "count"
          ? value.count
          : metric.kind === "average"
            ? value.count
              ? (value.sums[metric.id] ?? 0) / value.count
              : 0
            : value.sums[metric.id] ?? 0;

      return {
        ...metric,
        value: metricValue,
      };
    }),
  };
};

const toChartDatum = (
  item: { key: string; value: number },
  totalCount: number,
  selected: Set<string>,
  config: SerializableDashboardConfig["dimensions"][number],
  colorIndexByValue: Map<string, number>,
): ChartDatum => ({
  key: item.key,
  label: labelForDimensionValue(item.key, config),
  value: item.value,
  share: totalCount ? item.value / totalCount : 0,
  selected: selected.has(item.key),
  colorIndex: colorIndexByValue.get(item.key),
});

const getVisibleValues = (
  allValues: ChartDatum[],
  chartType: "bar" | "pie",
  totalCount: number,
  visibleLimit: number,
) => {
  if (chartType !== "bar" || allValues.length <= visibleLimit) {
    return allValues;
  }

  const topValues = allValues.slice(0, visibleLimit);
  const aggregatedValues = allValues.slice(visibleLimit);
  const aggregateValue = aggregatedValues.reduce((sum, item) => sum + item.value, 0);
  const aggregateSelected = aggregatedValues.some((item) => item.selected);

  return [
    ...topValues,
    {
      key: AGGREGATE_LABEL,
      label: AGGREGATE_LABEL,
      value: aggregateValue,
      share: totalCount ? aggregateValue / totalCount : 0,
      selected: aggregateSelected,
      isAggregate: true,
      aggregateCount: aggregatedValues.length,
    },
  ];
};

const getSummaries = (): DimensionSummary[] => {
  return currentConfig.dimensions.map((config) => {
    const handle = handles.get(config.id);
    const selected = activeFilters.get(config.id) ?? new Set<string>();
    const visibleLimit = Math.max(1, config.maxVisibleItems);

    if (!handle) {
      return {
        ...config,
        chartType: "bar",
        cardinality: 0,
        visibleCount: 0,
        hiddenCount: 0,
        totalCount: 0,
        valueLabel: getDimensionValueLabel(),
        values: [],
        allValues: [],
      };
    }

    const groupedValues = handle.group
      .all()
      .filter((item) => item.value > 0)
      .map((item) => {
        const key = String(item.key);
        return { key, label: labelForDimensionValue(key, config), value: item.value };
      })
      .sort((a, b) => {
        const byValue = b.value - a.value;
        return byValue || a.label.localeCompare(b.label) || a.key.localeCompare(b.key);
      });

    const chartType = groupedValues.length <= config.pieThreshold ? "pie" : "bar";
    const totalCount = groupedValues.reduce((sum, item) => sum + item.value, 0);
    const allValues = groupedValues.map((item) =>
      toChartDatum(item, totalCount, selected, config, handle.colorIndexByValue),
    );
    const values = getVisibleValues(allValues, chartType, totalCount, visibleLimit);
    const hiddenCount =
      chartType === "bar" ? Math.max(0, allValues.length - visibleLimit) : 0;

    return {
      ...config,
      chartType,
      cardinality: allValues.length,
      visibleCount: values.length,
      hiddenCount,
      totalCount,
      valueLabel: getDimensionValueLabel(),
      values,
      allValues,
    };
  });
};

const emitState = (type: "ready" | "state") => {
  send({
    type,
    payload: {
      activeFilters: serializeFilters(),
      dimensions: getSummaries(),
      metrics: getMetrics(),
    },
  });
};

const toggleFilter = (dimensionId: DimensionId, value: string) => {
  const values = activeFilters.get(dimensionId) ?? new Set<string>();

  if (values.has(value)) {
    values.delete(value);
  } else {
    values.add(value);
  }

  if (values.size === 0) {
    activeFilters.delete(dimensionId);
  } else {
    activeFilters.set(dimensionId, values);
  }

  applyFilters();
  emitState("state");
};

const clearFilter = (dimensionId: DimensionId) => {
  activeFilters.delete(dimensionId);
  applyFilters();
  emitState("state");
};

const clearAllFilters = () => {
  activeFilters.clear();
  applyFilters();
  emitState("state");
};

self.onmessage = async (event: MessageEvent<DashboardWorkerInMessage>) => {
  try {
    const message = event.data;

    if (message.type === "load") {
      const [rows, fetchedLookupMap] = await Promise.all([
        readDataset(message.url, message.jsonPath),
        readLookupMap(),
      ]);
      lookupMap = fetchedLookupMap;

      send({
        type: "progress",
        payload: {
          receivedBytes: 0,
          totalBytes: null,
          percent: null,
          stage: "indexing",
        },
      });

      initializeCrossfilter(rows, message.config);

      send({
        type: "progress",
        payload: {
          receivedBytes: 0,
          totalBytes: null,
          percent: 100,
          stage: "ready",
        },
      });
      emitState("ready");
      return;
    }

    if (!cf) {
      return;
    }

    if (message.type === "toggleFilter") {
      toggleFilter(message.dimensionId, message.value);
    }

    if (message.type === "clearFilter") {
      clearFilter(message.dimensionId);
    }

    if (message.type === "clearAllFilters") {
      clearAllFilters();
    }
  } catch (error) {
    send({
      type: "error",
      payload: {
        message: error instanceof Error ? error.message : "Unknown worker error",
      },
    });
  }
};
