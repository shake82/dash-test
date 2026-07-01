import {
  Area,
  AreaChart,
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
import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import { CHART_COLORS } from "@/lib/dashboardConfig";
import type { ChartDatum, DimensionId, DimensionSummary } from "@/lib/dashboardTypes";
import { BarAxisTick } from "./BarAxisTick";
import { ChartTooltip } from "./ChartTooltip";
import { getBarDatum, getBarFill, hasSelection } from "./chartUtils";

type DimensionChartProps = {
  summary: DimensionSummary;
  canFilter?: boolean;
  onShowAll: () => void;
  onToggle: (dimensionId: DimensionId, value: string) => void;
};

export function PieDimension({
  canFilter = true,
  summary,
  onShowAll,
  onToggle,
}: DimensionChartProps) {
  const hasActiveSelection = hasSelection(summary.values);

  const handleItemClick = (entry: ChartDatum) => {
    if (entry.isAggregate) {
      onShowAll();
      return;
    }

    if (!canFilter) {
      return;
    }

    onToggle(summary.id, entry.key);
  };

  const getPieFill = (entry: ChartDatum, index: number) => {
    if (entry.selected) {
      return "#111827";
    }

    return CHART_COLORS[(entry.colorIndex ?? index) % CHART_COLORS.length];
  };

  return (
    <Box h="100%" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Box style={{ flex: "1 1 auto", minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <Tooltip
              content={<ChartTooltip valueLabel={summary.valueLabel} />}
              isAnimationActive={false}
            />
            <Pie
              data={summary.values}
              dataKey="value"
              nameKey="label"
              innerRadius="48%"
              outerRadius="78%"
              paddingAngle={2}
              isAnimationActive={false}
            >
              {summary.values.map((entry, index) => (
                <Cell
                  key={entry.key}
                  fill={getPieFill(entry, index)}
                  opacity={hasActiveSelection && !entry.selected ? 0.38 : 1}
                  onClick={() => handleItemClick(entry)}
                  style={{ outline: "none", cursor: canFilter ? "pointer" : "default" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <Group
        component="ul"
        gap={6}
        justify="center"
        m={0}
        p={0}
        style={{ flex: "0 0 auto", listStyle: "none" }}
      >
        {summary.values.map((entry, index) => (
          <Box component="li" key={entry.key}>
            <UnstyledButton
              onClick={() => handleItemClick(entry)}
              aria-pressed={entry.selected}
              title={entry.label}
              style={{
                alignItems: "center",
                borderRadius: 4,
                cursor: canFilter ? "pointer" : "default",
                display: "flex",
                gap: 6,
                maxWidth: 128,
                opacity: hasActiveSelection && !entry.selected ? 0.46 : 1,
                padding: "3px 5px",
              }}
            >
              <Box
                aria-hidden="true"
                style={{
                  background: getPieFill(entry, index),
                  borderRadius: 2,
                  flex: "0 0 10px",
                  height: 10,
                  width: 10,
                }}
              />
              <Text size="xs" c="ink.8" truncate="end">
                {entry.label}
              </Text>
            </UnstyledButton>
          </Box>
        ))}
      </Group>
    </Box>
  );
}

export function BarDimension({
  canFilter = true,
  summary,
  onShowAll,
  onToggle,
}: DimensionChartProps) {
  const handleBarClick = (entry: unknown) => {
    const datum = getBarDatum(entry);

    if (!datum) {
      return;
    }

    if (datum.isAggregate) {
      onShowAll();
      return;
    }

    if (!canFilter) {
      return;
    }

    onToggle(summary.id, datum.key);
  };

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
          dataKey="label"
          width={120}
          interval={0}
          tickLine={false}
          axisLine={false}
          tick={<BarAxisTick maxWidth={112} />}
        />
        <Tooltip
          content={<ChartTooltip valueLabel={summary.valueLabel} />}
          isAnimationActive={false}
        />
        <Bar
          dataKey="value"
          radius={[0, 5, 5, 0]}
          background={{ fill: "#fff", fillOpacity: 0, pointerEvents: "all" }}
          isAnimationActive={false}
          onClick={handleBarClick}
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

export function AreaDimension({
  canFilter = true,
  summary,
  onToggle,
}: Omit<DimensionChartProps, "onShowAll">) {
  const areaValues = [...summary.values].sort(compareDateChartValues);
  const hasActiveSelection = hasSelection(areaValues);

  const handleChartClick = (entry: unknown) => {
    if (!canFilter) {
      return;
    }

    const datum = getAreaDatum(entry);

    if (datum) {
      onToggle(summary.id, datum.key);
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={areaValues}
        margin={{ top: 14, right: 18, bottom: 8, left: 8 }}
        onClick={handleChartClick}
      >
        <defs>
          <linearGradient id={`${summary.id}-area-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.34} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          reversed={false}
          tickLine={false}
          axisLine={false}
          minTickGap={18}
          tick={{ fill: "#4b5563", fontSize: 11 }}
        />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#4b5563", fontSize: 11 }}
        />
        <Tooltip
          content={<ChartTooltip valueLabel={summary.valueLabel} />}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#2563eb"
          strokeWidth={2}
          fill={`url(#${summary.id}-area-fill)`}
          fillOpacity={hasActiveSelection ? 0.5 : 1}
          dot={{
            fill: "#fff",
            r: 2.5,
            stroke: "#2563eb",
            strokeWidth: 1.5,
          }}
          activeDot={{
            fill: "#111827",
            r: 5,
            stroke: "#fff",
            strokeWidth: 2,
          }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function compareDateChartValues(a: ChartDatum, b: ChartDatum) {
  return dateSortValue(a.key, a.label).localeCompare(dateSortValue(b.key, b.label));
}

function dateSortValue(key: string, label: string) {
  const yearMonthKey = key.match(/^(\d{4})-(\d{2})/);

  if (yearMonthKey) {
    return `${yearMonthKey[1]}-${yearMonthKey[2]}`;
  }

  const monthYearLabel = label.match(/^(\d{2})-(\d{4})$/);

  if (monthYearLabel) {
    return `${monthYearLabel[2]}-${monthYearLabel[1]}`;
  }

  return key;
}

function getAreaDatum(entry: unknown) {
  if (!entry || typeof entry !== "object" || !("activePayload" in entry)) {
    return null;
  }

  const payload = (entry as { activePayload?: Array<{ payload?: Partial<ChartDatum> }> })
    .activePayload?.[0]?.payload;
  return typeof payload?.key === "string" ? (payload as ChartDatum) : null;
}
