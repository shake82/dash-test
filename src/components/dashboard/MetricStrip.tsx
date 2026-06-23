import { Card, SimpleGrid, Text } from "@mantine/core";
import type { WorkerStatePayload } from "@/lib/dashboardTypes";
import { compactNumber, currency, percent, wholeNumber } from "./formatters";

export function MetricStrip({ state }: { state: WorkerStatePayload }) {
  const metrics = state.metrics;
  const scopedShare = metrics.totalRows
    ? metrics.filteredRows / metrics.totalRows
    : 0;

  return (
    <SimpleGrid component="section" cols={{ base: 2, lg: 4 }} spacing="sm">
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
    </SimpleGrid>
  );
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
