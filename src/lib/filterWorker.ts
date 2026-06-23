import crossfilter from "crossfilter2";
import { DIMENSIONS } from "@/lib/dashboardConfig";
import type {
  ActiveFilters,
  ChartDatum,
  DashboardMetrics,
  DashboardWorkerInMessage,
  DashboardWorkerOutMessage,
  DataRow,
  DimensionId,
  DimensionSummary,
} from "@/lib/dashboardTypes";

type DimensionHandle = {
  id: DimensionId;
  dimension: crossfilter.Dimension<DataRow, string>;
  group: crossfilter.Group<DataRow, string, number>;
};

type MetricAccumulator = {
  count: number;
  revenue: number;
  units: number;
  satisfaction: number;
};

const BAR_VISIBLE_LIMIT = 5;
const AGGREGATE_LABEL = "Others";

let cf: crossfilter.Crossfilter<DataRow> | null = null;
let handles = new Map<DimensionId, DimensionHandle>();
let metricGroup: crossfilter.GroupAll<DataRow, MetricAccumulator> | null = null;
let totalRows = 0;
const activeFilters = new Map<DimensionId, Set<string>>();

const send = (message: DashboardWorkerOutMessage) => {
  self.postMessage(message);
};

const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
};

const valueForDimension = (row: DataRow, id: DimensionId) => {
  return normalizeValue(row[id]);
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

const initializeCrossfilter = (rows: DataRow[]) => {
  activeFilters.clear();
  handles = new Map();
  totalRows = rows.length;
  cf = crossfilter(rows);

  for (const config of DIMENSIONS) {
    const dimension = cf.dimension((row) => valueForDimension(row, config.id));
    const group = dimension.group<string, number>().reduceCount();
    handles.set(config.id, { id: config.id, dimension, group });
  }

  metricGroup = cf.groupAll<MetricAccumulator>().reduce(
    (state, row) => ({
      count: state.count + 1,
      revenue: state.revenue + row.revenue,
      units: state.units + row.units,
      satisfaction: state.satisfaction + row.satisfaction,
    }),
    (state, row) => ({
      count: state.count - 1,
      revenue: state.revenue - row.revenue,
      units: state.units - row.units,
      satisfaction: state.satisfaction - row.satisfaction,
    }),
    () => ({ count: 0, revenue: 0, units: 0, satisfaction: 0 }),
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
    revenue: 0,
    units: 0,
    satisfaction: 0,
  };

  return {
    totalRows,
    filteredRows: value.count,
    revenue: value.revenue,
    units: value.units,
    averageSatisfaction: value.count ? value.satisfaction / value.count : 0,
  };
};

const toChartDatum = (
  item: { key: string; value: number },
  totalCount: number,
  selected: Set<string>,
): ChartDatum => ({
  key: item.key,
  value: item.value,
  share: totalCount ? item.value / totalCount : 0,
  selected: selected.has(item.key),
});

const getVisibleValues = (
  allValues: ChartDatum[],
  chartType: "bar" | "pie",
  totalCount: number,
) => {
  if (chartType !== "bar" || allValues.length <= BAR_VISIBLE_LIMIT) {
    return allValues;
  }

  const topValues = allValues.slice(0, BAR_VISIBLE_LIMIT);
  const aggregatedValues = allValues.slice(BAR_VISIBLE_LIMIT);
  const aggregateValue = aggregatedValues.reduce((sum, item) => sum + item.value, 0);
  const aggregateSelected = aggregatedValues.some((item) => item.selected);

  return [
    ...topValues,
    {
      key: AGGREGATE_LABEL,
      value: aggregateValue,
      share: totalCount ? aggregateValue / totalCount : 0,
      selected: aggregateSelected,
      isAggregate: true,
      aggregateCount: aggregatedValues.length,
    },
  ];
};

const getSummaries = (): DimensionSummary[] => {
  return DIMENSIONS.map((config) => {
    const handle = handles.get(config.id);
    const selected = activeFilters.get(config.id) ?? new Set<string>();

    if (!handle) {
      return {
        ...config,
        chartType: "bar",
        cardinality: 0,
        visibleCount: 0,
        hiddenCount: 0,
        totalCount: 0,
        values: [],
        allValues: [],
      };
    }

    const groupedValues = handle.group
      .all()
      .filter((item) => item.value > 0)
      .map((item) => ({ key: String(item.key), value: item.value }))
      .sort((a, b) => {
        const byValue = b.value - a.value;
        return byValue || a.key.localeCompare(b.key);
      });

    const chartType = groupedValues.length <= config.pieThreshold ? "pie" : "bar";
    const totalCount = groupedValues.reduce((sum, item) => sum + item.value, 0);
    const allValues = groupedValues.map((item) =>
      toChartDatum(item, totalCount, selected),
    );
    const values = getVisibleValues(allValues, chartType, totalCount);
    const hiddenCount =
      chartType === "bar" ? Math.max(0, allValues.length - BAR_VISIBLE_LIMIT) : 0;

    return {
      ...config,
      chartType,
      cardinality: allValues.length,
      visibleCount: values.length,
      hiddenCount,
      totalCount,
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
      const rows = await readDataset(message.url, message.jsonPath);

      send({
        type: "progress",
        payload: {
          receivedBytes: 0,
          totalBytes: null,
          percent: null,
          stage: "indexing",
        },
      });

      initializeCrossfilter(rows);

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
