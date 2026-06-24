import { Paper, Text } from "@mantine/core";
import type { ChartDatum } from "@/lib/dashboardTypes";
import { percent, wholeNumber } from "./formatters";

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
  valueLabel?: string;
};

export function ChartTooltip({ active, payload, valueLabel = "rows" }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const datum = payload[0].payload;

  return (
    <Paper withBorder shadow="md" px="sm" py={6} radius="md" bg="white">
      <Text size="sm" fw={600} c="ink.9">
        {datum.label}
      </Text>
      <Text size="sm" c="dimmed">
        {wholeNumber.format(datum.value)} {valueLabel}, {percent.format(datum.share)}
      </Text>
      {datum.isAggregate && datum.aggregateCount ? (
        <Text mt={4} size="xs" c="dimmed">
          {datum.aggregateCount} options
        </Text>
      ) : null}
    </Paper>
  );
}
