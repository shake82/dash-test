import { CHART_COLORS } from "@/lib/dashboardConfig";
import type { ChartDatum } from "@/lib/dashboardTypes";

export function hasSelection(values: ChartDatum[]) {
  return values.some((item) => item.selected);
}

export function getBarFill(entry: ChartDatum, index: number) {
  if (entry.selected) {
    return "#111827";
  }

  if (entry.isAggregate) {
    return "#737373";
  }

  return CHART_COLORS[(entry.colorIndex ?? index) % CHART_COLORS.length];
}

export function getBarDatum(entry: unknown) {
  if (!entry || typeof entry !== "object" || !("payload" in entry)) {
    return null;
  }

  const payload = (entry as { payload?: Partial<ChartDatum> }).payload;
  return typeof payload?.key === "string" ? (payload as ChartDatum) : null;
}
