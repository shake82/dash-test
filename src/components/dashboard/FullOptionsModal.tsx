import { Box, Modal, ScrollArea, Stack, Text, Title } from "@mantine/core";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DimensionId, DimensionSummary } from "@/lib/dashboardTypes";
import { ChartTooltip } from "./ChartTooltip";
import { getBarDatum, getBarFill, hasSelection } from "./chartUtils";
import { wholeNumber } from "./formatters";

type FullOptionsModalProps = {
  summary: DimensionSummary;
  onClose: () => void;
  onToggle: (dimensionId: DimensionId, value: string) => void;
};

export function FullOptionsModal({ summary, onClose, onToggle }: FullOptionsModalProps) {
  const chartHeight = Math.max(340, Math.min(960, summary.allValues.length * 34));

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Stack gap={2}>
          <Title order={2} size="h3" id={`${summary.id}-modal-title`} c="ink.9">
            {summary.label}
          </Title>
          <Text size="sm" c="dimmed">
            {summary.cardinality} options, {wholeNumber.format(summary.totalCount)} rows
          </Text>
        </Stack>
      }
      size="xl"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
      radius="md"
      overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
    >
      <Box h={chartHeight}>
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
              dataKey="label"
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
      </Box>
    </Modal>
  );
}
