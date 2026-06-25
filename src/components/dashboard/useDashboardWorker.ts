import { useEffect, useRef, useState } from "react";
import type {
  ChartDatum,
  DashboardConfig,
  DashboardWorkerInMessage,
  DashboardWorkerOutMessage,
  DimensionConfig,
  DimensionSummary,
  SerializableDashboardConfig,
  WorkerLoadProgress,
  WorkerStatePayload,
} from "@/lib/dashboardTypes";
import type { LoadStatus } from "./formatters";

const emptyProgress: WorkerLoadProgress = {
  receivedBytes: 0,
  totalBytes: null,
  percent: null,
  stage: "connecting",
};

const AGGREGATE_LABEL = "Others";

export function useDashboardWorker(
  dataUrl: string,
  jsonPath: string,
  config: DashboardConfig,
) {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [progress, setProgress] = useState<WorkerLoadProgress>(emptyProgress);
  const [dashboardState, setDashboardState] = useState<WorkerStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../../lib/filterWorker.ts", import.meta.url), {
      type: "module",
    });

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<DashboardWorkerOutMessage>) => {
      const message = event.data;

      if (message.type === "progress") {
        setProgress(message.payload);
        return;
      }

      if (message.type === "ready" || message.type === "state") {
        setDashboardState(applyLookupLabels(message.payload, config));
        setStatus("ready");
        return;
      }

      if (message.type === "error") {
        setError(message.payload.message);
        setStatus("error");
      }
    };

    postToWorker(worker, {
      type: "load",
      url: dataUrl,
      jsonPath,
      config: getSerializableConfig(config),
    });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [config, dataUrl, jsonPath]);

  const send = (message: DashboardWorkerInMessage) => {
    postToWorker(workerRef.current, message);
  };

  return { dashboardState, error, progress, send, status };
}

function postToWorker(worker: Worker | null, message: DashboardWorkerInMessage) {
  worker?.postMessage(message);
}

function getSerializableConfig(config: DashboardConfig): SerializableDashboardConfig {
  return {
    metrics: config.metrics,
    dimensionMeasure: config.dimensionMeasure,
    dimensions: config.dimensions.map(({ lookup, ...dimension }) => {
      if (!lookup || typeof lookup === "function") {
        return dimension;
      }

      return { ...dimension, lookup };
    }),
  };
}

export function applyLookupLabels(
  payload: WorkerStatePayload,
  config: DashboardConfig,
): WorkerStatePayload {
  const dimensionsById = new Map(config.dimensions.map((dimension) => [dimension.id, dimension]));

  return {
    ...payload,
    dimensions: payload.dimensions.map((summary) => {
      const dimensionConfig = dimensionsById.get(summary.id) ?? summary;
      return applySummaryLookupLabels(summary, dimensionConfig);
    }),
  };
}

function applySummaryLookupLabels(
  summary: DimensionSummary,
  dimensionConfig: DimensionConfig,
): DimensionSummary {
  const allValues = summary.allValues
    .map((datum) => applyDatumLookupLabel(datum, dimensionConfig))
    .sort((a, b) => {
      const byValue = b.value - a.value;
      return byValue || a.label.localeCompare(b.label) || a.key.localeCompare(b.key);
    });
  const visibleLimit = Math.max(1, dimensionConfig.maxVisibleItems);
  const values = getVisibleValues(allValues, summary.chartType, summary.totalCount, visibleLimit);

  return {
    ...summary,
    lookup: dimensionConfig.lookup,
    values,
    allValues,
  };
}

function applyDatumLookupLabel(
  datum: ChartDatum,
  dimensionConfig: DimensionConfig,
): ChartDatum {
  if (datum.isAggregate) {
    return { ...datum, label: datum.label || datum.key };
  }

  return {
    ...datum,
    label: getLookupLabel(datum.key, dimensionConfig),
  };
}

function getLookupLabel(value: string, dimensionConfig: DimensionConfig) {
  const { lookup } = dimensionConfig;

  if (!lookup) {
    return value;
  }

  if (typeof lookup === "function") {
    return lookup(value) ?? value;
  }

  return lookup[value] ?? value;
}

function getVisibleValues(
  allValues: ChartDatum[],
  chartType: DimensionSummary["chartType"],
  totalCount: number,
  visibleLimit: number,
) {
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
}
