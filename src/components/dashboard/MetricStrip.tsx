import { Card, SimpleGrid, Text } from "@mantine/core";
import type { DashboardMetricValue, WorkerStatePayload } from "@/lib/dashboardTypes";
import { compactNumber, currency, percent, wholeNumber } from "./formatters";

type MetricStripProps = {
  compact?: boolean;
  state: WorkerStatePayload;
};

export function MetricStrip({ compact = false, state }: MetricStripProps) {
  const metrics = state.metrics;
  const scopedShare = metrics.totalRows ? metrics.filteredRows / metrics.totalRows : 0;
  const desktopColumns = Math.max(1, metrics.values.length);

  return (
    <SimpleGrid component="section" cols={{ base: 2, lg: desktopColumns }} spacing={compact ? 8 : "sm"}>
      {metrics.values.map((metric) => (
        <Metric
          key={metric.id}
          compact={compact}
          label={metric.label}
          value={formatMetricValue(metric)}
          detail={getMetricDetail(metric, scopedShare)}
        />
      ))}
    </SimpleGrid>
  );
}

function formatMetricValue(metric: DashboardMetricValue) {
  if (metric.format === "currency") {
    return currency.format(metric.value);
  }

  if (metric.format === "decimal") {
    return metric.value.toFixed(1);
  }

  if (metric.format === "percent") {
    return percent.format(metric.value);
  }

  if (metric.format === "compact") {
    return compactNumber.format(metric.value);
  }

  return wholeNumber.format(metric.value);
}

function getMetricDetail(metric: DashboardMetricValue, scopedShare: number) {
  if (metric.kind === "count") {
    return metric.detail
      ? `${percent.format(scopedShare)} ${metric.detail}`
      : percent.format(scopedShare);
  }

  return metric.detail ?? metric.kind;
}

type MetricProps = {
  compact: boolean;
  label: string;
  value: string;
  detail: string;
};

function Metric({ compact, label, value, detail }: MetricProps) {
  return (
    <Card component="article" withBorder shadow="xs" p={compact ? "xs" : "md"} radius="md">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        {label}
      </Text>
      <Text mt={compact ? 2 : 6} size={compact ? "lg" : "xl"} fw={700} c="ink.9" lh={1.08}>
        {value}
      </Text>
      <Text mt={compact ? 0 : 2} size={compact ? "xs" : "sm"} c="dimmed">
        {detail}
      </Text>
    </Card>
  );
}
