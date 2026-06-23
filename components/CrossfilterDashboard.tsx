"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Database, FilterX, Loader2, Maximize2, RotateCcw, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, DIMENSIONS } from "@/lib/dashboardConfig";
import type {
  ActiveFilters,
  ChartDatum,
  DashboardWorkerInMessage,
  DashboardWorkerOutMessage,
  DimensionId,
  DimensionSummary,
  WorkerLoadProgress,
  WorkerStatePayload,
} from "@/lib/dashboardTypes";

type Props = {
  dataUrl: string;
};

type LoadStatus = "loading" | "ready" | "error";

const emptyProgress: WorkerLoadProgress = {
  receivedBytes: 0,
  totalBytes: null,
  percent: null,
  stage: "connecting",
};

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const wholeNumber = new Intl.NumberFormat("en-US");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const dimensionLabels = new Map(DIMENSIONS.map((item) => [item.id, item.label]));

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getProgressLabel = (progress: WorkerLoadProgress) => {
  if (progress.stage === "connecting") {
    return "Connecting";
  }

  if (progress.stage === "parsing") {
    return "Parsing dataset";
  }

  if (progress.stage === "indexing") {
    return "Indexing dimensions";
  }

  if (progress.stage === "ready") {
    return "Ready";
  }

  if (progress.totalBytes) {
    return `${formatBytes(progress.receivedBytes)} of ${formatBytes(progress.totalBytes)}`;
  }

  return `${formatBytes(progress.receivedBytes)} received`;
};

const selectedCount = (filters: ActiveFilters) => {
  return Object.values(filters).reduce(
    (sum, values) => sum + (values?.length ?? 0),
    0,
  );
};

export function CrossfilterDashboard({ dataUrl }: Props) {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [progress, setProgress] = useState<WorkerLoadProgress>(emptyProgress);
  const [dashboardState, setDashboardState] = useState<WorkerStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDimensionId, setExpandedDimensionId] = useState<DimensionId | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../lib/filterWorker.ts", import.meta.url), {
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
        setDashboardState(message.payload);
        setStatus("ready");
        return;
      }

      if (message.type === "error") {
        setError(message.payload.message);
        setStatus("error");
      }
    };

    postToWorker(worker, { type: "load", url: dataUrl });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [dataUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedDimensionId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filterCount = selectedCount(dashboardState?.activeFilters ?? {});

  const filterEntries = useMemo(() => {
    const active = dashboardState?.activeFilters ?? {};
    return Object.entries(active) as Array<[DimensionId, string[]]>;
  }, [dashboardState?.activeFilters]);

  const expandedSummary = useMemo(() => {
    return dashboardState?.dimensions.find((item) => item.id === expandedDimensionId) ?? null;
  }, [dashboardState?.dimensions, expandedDimensionId]);

  const send = (message: DashboardWorkerInMessage) => {
    postToWorker(workerRef.current, message);
  };

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-neutral-950">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-700">
              <Database size={18} aria-hidden="true" />
              Crossfilter analytics
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-neutral-950 sm:text-3xl">
              Dimension dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} progress={progress} />
            <button
              type="button"
              onClick={() => send({ type: "clearAllFilters" })}
              disabled={!filterCount || status !== "ready"}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45"
              title="Clear filters"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Clear
            </button>
          </div>
        </header>

        {status === "error" ? (
          <ErrorState message={error ?? "Unable to load the dataset."} />
        ) : null}

        {status === "loading" ? <LoadingState progress={progress} /> : null}

        {dashboardState && status === "ready" ? (
          <>
            <MetricStrip state={dashboardState} />
            <ActiveFiltersBar
              entries={filterEntries}
              onClearFilter={(dimensionId) => send({ type: "clearFilter", dimensionId })}
              onRemoveValue={(dimensionId, value) =>
                send({ type: "toggleFilter", dimensionId, value })
              }
            />
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {dashboardState.dimensions.map((summary) => (
                <DimensionChart
                  key={summary.id}
                  summary={summary}
                  onShowAll={() => setExpandedDimensionId(summary.id)}
                  onToggle={(dimensionId, value) =>
                    send({ type: "toggleFilter", dimensionId, value })
                  }
                />
              ))}
            </section>
            {expandedSummary ? (
              <FullOptionsModal
                summary={expandedSummary}
                onClose={() => setExpandedDimensionId(null)}
                onToggle={(dimensionId, value) =>
                  send({ type: "toggleFilter", dimensionId, value })
                }
              />
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}

function postToWorker(worker: Worker | null, message: DashboardWorkerInMessage) {
  worker?.postMessage(message);
}

function StatusBadge({
  status,
  progress,
}: {
  status: LoadStatus;
  progress: WorkerLoadProgress;
}) {
  const label = status === "ready" ? "Ready" : getProgressLabel(progress);

  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm">
      {status === "loading" ? (
        <Loader2 size={16} className="animate-spin text-blue-600" aria-hidden="true" />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full bg-teal-600" aria-hidden="true" />
      )}
      {label}
    </div>
  );
}

function LoadingState({ progress }: { progress: WorkerLoadProgress }) {
  const hasPercent = typeof progress.percent === "number";

  return (
    <section className="grid min-h-[58vh] place-items-center rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="w-full max-w-xl space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase text-neutral-500">Dataset load</p>
          <h2 className="text-2xl font-semibold text-neutral-950">
            {getProgressLabel(progress)}
          </h2>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-neutral-200">
          <div
            className={`h-full rounded-full bg-blue-600 transition-all duration-300 ${
              hasPercent ? "" : "w-1/2 animate-pulse"
            }`}
            style={{ width: hasPercent ? `${progress.percent}%` : undefined }}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>{progress.stage}</span>
          <span>{hasPercent ? `${progress.percent}%` : "Working"}</span>
        </div>
      </div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      {message}
    </section>
  );
}

function MetricStrip({ state }: { state: WorkerStatePayload }) {
  const metrics = state.metrics;
  const scopedShare = metrics.totalRows
    ? metrics.filteredRows / metrics.totalRows
    : 0;

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric
        label="Rows in scope"
        value={wholeNumber.format(metrics.filteredRows)}
        detail={percent.format(scopedShare)}
      />
      <Metric label="Revenue" value={currency.format(metrics.revenue)} detail="filtered total" />
      <Metric label="Units" value={compactNumber.format(metrics.units)} detail="filtered total" />
      <Metric
        label="Satisfaction"
        value={metrics.averageSatisfaction.toFixed(1)}
        detail="average score"
      />
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
      <p className="mt-1 text-sm text-neutral-500">{detail}</p>
    </article>
  );
}

function ActiveFiltersBar({
  entries,
  onClearFilter,
  onRemoveValue,
}: {
  entries: Array<[DimensionId, string[]]>;
  onClearFilter: (dimensionId: DimensionId) => void;
  onRemoveValue: (dimensionId: DimensionId, value: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <section className="flex min-h-12 items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
        <FilterX size={16} aria-hidden="true" />
        No active filters
      </section>
    );
  }

  return (
    <section className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-3 shadow-sm">
      {entries.map(([dimensionId, values]) => (
        <div
          key={dimensionId}
          className="flex flex-wrap items-center gap-2 rounded-md bg-neutral-100 px-2 py-1"
        >
          <span className="text-xs font-semibold uppercase text-neutral-500">
            {dimensionLabels.get(dimensionId)}
          </span>
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onRemoveValue(dimensionId, value)}
              className="inline-flex h-7 max-w-[240px] items-center gap-1 rounded-md bg-white px-2 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
              title={`Remove ${value}`}
            >
              <span className="truncate">{value}</span>
              <X size={13} aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onClearFilter(dimensionId)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-white hover:text-neutral-950"
            title={`Clear ${dimensionLabels.get(dimensionId)}`}
          >
            <FilterX size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
    </section>
  );
}

function DimensionChart({
  summary,
  onShowAll,
  onToggle,
}: {
  summary: DimensionSummary;
  onShowAll: () => void;
  onToggle: (dimensionId: DimensionId, value: string) => void;
}) {
  return (
    <article className="flex min-h-[360px] flex-col rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">{summary.label}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {wholeNumber.format(summary.totalCount)} rows across {summary.cardinality} items
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {summary.hiddenCount ? (
            <button
              type="button"
              onClick={onShowAll}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              title={`Show all ${summary.label}`}
            >
              <Maximize2 size={14} aria-hidden="true" />
              Show all
            </button>
          ) : null}
          <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium uppercase text-neutral-600">
            {summary.chartType}
          </span>
        </div>
      </header>

      <div className="mt-3 h-[250px] min-h-[250px]">
        {summary.values.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-neutral-500">No rows</div>
        ) : summary.chartType === "pie" ? (
          <PieDimension summary={summary} onToggle={onToggle} />
        ) : (
          <BarDimension summary={summary} onShowAll={onShowAll} onToggle={onToggle} />
        )}
      </div>

      <footer className="mt-3 flex min-h-6 items-center justify-between gap-2 text-xs text-neutral-500">
        <span>{summary.visibleCount} shown</span>
        {summary.hiddenCount ? <span>{summary.hiddenCount} in Others</span> : null}
      </footer>
    </article>
  );
}

function PieDimension({
  summary,
  onToggle,
}: {
  summary: DimensionSummary;
  onToggle: (dimensionId: DimensionId, value: string) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Tooltip content={<ChartTooltip />} />
        <Pie
          data={summary.values}
          dataKey="value"
          nameKey="key"
          innerRadius="52%"
          outerRadius="82%"
          paddingAngle={2}
          isAnimationActive={false}
        >
          {summary.values.map((entry, index) => (
            <Cell
              key={entry.key}
              fill={entry.selected ? "#111827" : CHART_COLORS[index % CHART_COLORS.length]}
              opacity={hasSelection(summary.values) && !entry.selected ? 0.38 : 1}
              onClick={() => onToggle(summary.id, entry.key)}
              className="outline-none"
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function BarDimension({
  summary,
  onShowAll,
  onToggle,
}: {
  summary: DimensionSummary;
  onShowAll: () => void;
  onToggle: (dimensionId: DimensionId, value: string) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={summary.values}
        layout="vertical"
        margin={{ top: 8, right: 18, bottom: 8, left: 8 }}
      >
        <CartesianGrid horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="key"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#525252", fontSize: 12 }}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          dataKey="value"
          radius={[0, 5, 5, 0]}
          isAnimationActive={false}
          onClick={(entry) => {
            const datum = getBarDatum(entry);

            if (!datum) {
              return;
            }

            if (datum.isAggregate) {
              onShowAll();
              return;
            }

            onToggle(summary.id, datum.key);
          }}
        >
          {summary.values.map((entry, index) => (
            <Cell
              key={entry.key}
              fill={getBarFill(entry, index)}
              opacity={hasSelection(summary.values) && !entry.selected ? 0.4 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function FullOptionsModal({
  summary,
  onClose,
  onToggle,
}: {
  summary: DimensionSummary;
  onClose: () => void;
  onToggle: (dimensionId: DimensionId, value: string) => void;
}) {
  const chartHeight = Math.max(340, Math.min(960, summary.allValues.length * 34));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/55 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${summary.id}-modal-title`}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 id={`${summary.id}-modal-title`} className="text-lg font-semibold text-neutral-950">
              {summary.label}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {summary.cardinality} options, {wholeNumber.format(summary.totalCount)} rows
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"
            title="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto px-4 py-4">
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.allValues}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 12 }}
              >
                <CartesianGrid horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="key"
                  width={170}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={{ fill: "#525252", fontSize: 12 }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[0, 5, 5, 0]}
                  isAnimationActive={false}
                  onClick={(entry) => {
                    const datum = getBarDatum(entry);

                    if (datum) {
                      onToggle(summary.id, datum.key);
                    }
                  }}
                >
                  {summary.allValues.map((entry, index) => (
                    <Cell
                      key={entry.key}
                      fill={getBarFill(entry, index)}
                      opacity={hasSelection(summary.allValues) && !entry.selected ? 0.42 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

function hasSelection(values: ChartDatum[]) {
  return values.some((item) => item.selected);
}

function getBarFill(entry: ChartDatum, index: number) {
  if (entry.selected) {
    return "#111827";
  }

  if (entry.isAggregate) {
    return "#737373";
  }

  return CHART_COLORS[index % CHART_COLORS.length];
}

function getBarDatum(entry: unknown) {
  if (!entry || typeof entry !== "object" || !("payload" in entry)) {
    return null;
  }

  const payload = (entry as { payload?: Partial<ChartDatum> }).payload;
  return typeof payload?.key === "string" ? (payload as ChartDatum) : null;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const datum = payload[0].payload;

  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-neutral-950">{datum.key}</p>
      <p className="text-neutral-600">
        {wholeNumber.format(datum.value)} rows, {percent.format(datum.share)}
      </p>
      {datum.isAggregate && datum.aggregateCount ? (
        <p className="mt-1 text-xs text-neutral-500">
          {datum.aggregateCount} options
        </p>
      ) : null}
    </div>
  );
}
