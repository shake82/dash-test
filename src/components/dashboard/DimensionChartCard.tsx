"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { Maximize2 } from "lucide-react";
import type { DimensionId, DimensionSummary } from "@/lib/dashboardTypes";
import { wholeNumber } from "./formatters";
import { BarDimension, PieDimension } from "./DimensionCharts";

type DimensionChartCardProps = {
  summary: DimensionSummary;
  canFilter?: boolean;
  onShowAll: () => void;
  onToggle: (dimensionId: DimensionId, value: string) => void;
};

const chartTypeOptions: Array<{ label: string; value: DimensionSummary["chartType"] }> = [
  { label: "Bar", value: "bar" },
  { label: "Pie", value: "pie" },
];

export function DimensionChartCard({
  canFilter = true,
  summary,
  onShowAll,
  onToggle,
}: DimensionChartCardProps) {
  const [chartType, setChartType] = useState<DimensionSummary["chartType"]>(summary.chartType);

  return (
    <Card component="article" withBorder shadow="xs" p="md" radius="md" mih={360}>
      <Stack h="100%" gap="sm">
        <Group component="header" align="flex-start" justify="space-between" gap="sm">
          <Stack gap={2}>
            <Title order={2} size="h4" c="ink.9">
              {summary.label}
            </Title>
            <Text size="sm" c="dimmed">
              {wholeNumber.format(summary.totalCount)} {summary.valueLabel} across{" "}
              {summary.cardinality} items
            </Text>
          </Stack>
          <Group gap="xs" style={{ flexShrink: 0 }}>
            {!canFilter ? (
              <Tooltip
                label="Showing pre-rolled preview data. Chart filtering will be available when the full dataset finishes loading."
                openDelay={250}
                withArrow
              >
                <Badge color="yellow" variant="light" radius="sm" tt="none">
                  Preview
                </Badge>
              </Tooltip>
            ) : null}
            {summary.hiddenCount ? (
              <Button
                variant="default"
                size="compact-sm"
                leftSection={<Maximize2 size={14} aria-hidden="true" />}
                onClick={onShowAll}
                title={`Show all ${summary.label}`}
              >
                Show all
              </Button>
            ) : null}
            <SegmentedControl
              aria-label={`${summary.label} chart type`}
              size="xs"
              data={chartTypeOptions}
              value={chartType}
              onChange={(value) => setChartType(value as DimensionSummary["chartType"])}
            />
          </Group>
        </Group>

        <Box h={250} mih={250}>
          {summary.values.length === 0 ? (
            <Center h="100%">
              <Text size="sm" c="dimmed">
                No {summary.valueLabel}
              </Text>
            </Center>
          ) : chartType === "pie" ? (
            <PieDimension
              summary={summary}
              canFilter={canFilter}
              onShowAll={onShowAll}
              onToggle={onToggle}
            />
          ) : (
            <BarDimension
              summary={summary}
              canFilter={canFilter}
              onShowAll={onShowAll}
              onToggle={onToggle}
            />
          )}
        </Box>

        <Group component="footer" justify="space-between" gap="xs" mih={24} mt="auto">
          <Text size="xs" c="dimmed">
            {summary.visibleCount} shown
          </Text>
          {summary.hiddenCount ? (
            <Text size="xs" c="dimmed">
              {summary.hiddenCount} in Others
            </Text>
          ) : null}
        </Group>
      </Stack>
    </Card>
  );
}
