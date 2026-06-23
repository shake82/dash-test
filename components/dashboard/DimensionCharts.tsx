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
import { CHART_COLORS } from "@/lib/dashboardConfig";
import type { DimensionId, DimensionSummary } from "@/lib/dashboardTypes";
import { ChartTooltip } from "./ChartTooltip";
import { getBarDatum, getBarFill, hasSelection } from "./chartUtils";

type DimensionChartProps = {
  summary: DimensionSummary;
  onShowAll: () => void;
  onToggle: (dimensionId: DimensionId, value: string) => void;
};

export function PieDimension({ summary, onShowAll, onToggle }: DimensionChartProps) {
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
              onClick={() => {
                if (entry.isAggregate) {
                  onShowAll();
                  return;
                }

                onToggle(summary.id, entry.key);
              }}
              style={{ outline: "none", cursor: "pointer" }}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BarDimension({ summary, onShowAll, onToggle }: DimensionChartProps) {
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
