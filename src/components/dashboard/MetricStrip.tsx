import { Card, SimpleGrid, Text } from "@mantine/core";
import type { DashboardMetricValue, WorkerStatePayload } from "@/lib/dashboardTypes";
import { compactNumber, currency, percent, wholeNumber } from "./formatters";

export function MetricStrip({ state }: { state: WorkerStatePayload }) {
  const metrics = state.metrics;
  const scopedShare = metrics.totalRows ? metrics.filteredRows / metrics.totalRows : 0;
  const desktopColumns = Math.max(1, metrics.values.length);

  return (
    <SimpleGrid component="section" cols={{ base: 2, lg: desktopColumns }} spacing="sm">
      {metrics.values.map((metric) => (
        <Metric
          key={metric.id}
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
  label: string;
  value: string;
  detail: string;
};

function Metric({ label, value, detail }: MetricProps) {
  return (
    <Card component="article" withBorder shadow="xs" p="md" radius="md">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        {label}
      </Text>
      <Text mt={6} size="xl" fw={700} c="ink.9">
        {value}
      </Text>
      <Text mt={2} size="sm" c="dimmed">
        {detail}
      </Text>
    </Card>
  );
}
