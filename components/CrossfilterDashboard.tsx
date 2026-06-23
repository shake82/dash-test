"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, SimpleGrid, Stack } from "@mantine/core";
import { ActiveFiltersBar } from "@/components/dashboard/ActiveFiltersBar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DimensionChartCard } from "@/components/dashboard/DimensionChartCard";
import { ErrorState, LoadingState } from "@/components/dashboard/StatusStates";
import { FullOptionsModal } from "@/components/dashboard/FullOptionsModal";
import { MetricStrip } from "@/components/dashboard/MetricStrip";
import { selectedCount } from "@/components/dashboard/formatters";
import { useDashboardWorker } from "@/components/dashboard/useDashboardWorker";
import type { DimensionId } from "@/lib/dashboardTypes";

type Props = {
  dataUrl: string;
};

export function CrossfilterDashboard({ dataUrl }: Props) {
  const { dashboardState, error, progress, send, status } = useDashboardWorker(dataUrl);
  const [expandedDimensionId, setExpandedDimensionId] = useState<DimensionId | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedDimensionId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filterCount = selectedCount(dashboardState?.activeFilters ?? {});

  const filterEntries = useMemo(() => {
    const active = dashboardState?.activeFilters ?? {};
    return Object.entries(active) as Array<[DimensionId, string[]]>;
  }, [dashboardState?.activeFilters]);

  const expandedSummary = useMemo(() => {
    return dashboardState?.dimensions.find((item) => item.id === expandedDimensionId) ?? null;
  }, [dashboardState?.dimensions, expandedDimensionId]);

  return (
    <Box component="main" mih="100vh" bg="gray.0" c="ink.9">
      <Stack maw={1800} mx="auto" gap="md" px={{ base: "md", sm: "xl" }} py="md">
        <DashboardHeader
          status={status}
          progress={progress}
          filterCount={filterCount}
          onClearFilters={() => send({ type: "clearAllFilters" })}
        />

        {status === "error" ? (
          <ErrorState message={error ?? "Unable to load the dataset."} />
        ) : null}

        {status === "loading" ? <LoadingState progress={progress} /> : null}

        {dashboardState && status === "ready" ? (
          <>
            <MetricStrip state={dashboardState} />
            <ActiveFiltersBar
              entries={filterEntries}
              onClearFilter={(dimensionId) => send({ type: "clearFilter", dimensionId })}
              onRemoveValue={(dimensionId, value) =>
                send({ type: "toggleFilter", dimensionId, value })
              }
            />
            <SimpleGrid cols={{ base: 1, lg: 2, xl: 3 }} spacing="md">
              {dashboardState.dimensions.map((summary) => (
                <DimensionChartCard
                  key={summary.id}
                  summary={summary}
                  onShowAll={() => setExpandedDimensionId(summary.id)}
                  onToggle={(dimensionId, value) =>
                    send({ type: "toggleFilter", dimensionId, value })
                  }
                />
              ))}
            </SimpleGrid>
            {expandedSummary ? (
              <FullOptionsModal
                summary={expandedSummary}
                onClose={() => setExpandedDimensionId(null)}
                onToggle={(dimensionId, value) =>
                  send({ type: "toggleFilter", dimensionId, value })
                }
              />
            ) : null}
          </>
        ) : null}
      </Stack>
    </Box>
  );
}
