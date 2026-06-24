import type { ActiveFilters, WorkerLoadProgress } from "@/lib/dashboardTypes";

export type LoadStatus = "loading" | "ready" | "error";

export const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const wholeNumber = new Intl.NumberFormat("en-US");

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function selectedCount(filters: ActiveFilters) {
  return Object.values(filters).reduce(
    (sum, values) => sum + (values?.length ?? 0),
    0,
  );
}

export function getProgressLabel(progress: WorkerLoadProgress) {
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
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
