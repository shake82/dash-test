import { useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Center,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Search, X } from "lucide-react";
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
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLocaleLowerCase();

  const filteredValues = useMemo(() => {
    return summary.allValues
      .filter((entry) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          entry.label.toLocaleLowerCase().includes(normalizedQuery) ||
          entry.key.toLocaleLowerCase().includes(normalizedQuery)
        );
      });
  }, [normalizedQuery, summary.allValues]);

  const isSearching = normalizedQuery.length > 0;
  const chartHeight =
    isSearching && filteredValues.length < 5
      ? Math.max(120, filteredValues.length * 42)
      : Math.max(340, Math.min(960, filteredValues.length * 34));
  const hasActiveSelection = hasSelection(summary.allValues);

  const handleBarClick = (entry: unknown) => {
    const datum = getBarDatum(entry);

    if (datum) {
      onToggle(summary.id, datum.key);
    }
  };

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
            {summary.cardinality} options, {wholeNumber.format(summary.totalCount)}{" "}
            {summary.valueLabel}
          </Text>
        </Stack>
      }
      size="xl"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
      radius="md"
      overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
      styles={{
        body: {
          maxHeight: "66vh",
          minHeight: "48vh",
          overflow: "hidden",
        },
      }}
    >
      <Stack gap="sm" h="48vh">
        <TextInput
          aria-label={`Find ${summary.label} value`}
          placeholder={`Find ${summary.label.toLocaleLowerCase()} value`}
          leftSection={<Search size={16} aria-hidden="true" />}
          rightSection={
            query ? (
              <ActionIcon
                aria-label="Clear search"
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setQuery("")}
              >
                <X size={15} aria-hidden="true" />
              </ActionIcon>
            ) : null
          }
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />

        {normalizedQuery ? (
          <Text size="xs" c="dimmed">
            {filteredValues.length} of {summary.cardinality} options
          </Text>
        ) : null}

        <Box style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
          <Box h={chartHeight}>
            {filteredValues.length === 0 ? (
              <Center h="100%">
                <Text size="sm" c="dimmed">
                  No matching values
                </Text>
              </Center>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredValues}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 4, left: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fill: "#525252", fontSize: 12 }}
                  />
                  <Tooltip
                    content={<ChartTooltip valueLabel={summary.valueLabel} />}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 5, 5, 0]}
                    maxBarSize={25}
                    background={{ fill: "#fff", fillOpacity: 0, pointerEvents: "all" }}
                    isAnimationActive={false}
                    onClick={handleBarClick}
                  >
                    {filteredValues.map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={getBarFill(entry, index)}
                        opacity={hasActiveSelection && !entry.selected ? 0.42 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>
      </Stack>
    </Modal>
  );
}
