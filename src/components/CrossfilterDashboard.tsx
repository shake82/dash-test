"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, SimpleGrid, Stack } from "@mantine/core";
import { ActiveFiltersBar } from "@/components/dashboard/ActiveFiltersBar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DimensionChartCard } from "@/components/dashboard/DimensionChartCard";
import { ErrorState, LoadingState } from "@/components/dashboard/StatusStates";
import { FullOptionsModal } from "@/components/dashboard/FullOptionsModal";
import { MetricStrip } from "@/components/dashboard/MetricStrip";
import { selectedCount } from "@/components/dashboard/formatters";
import { useDashboardWorker } from "@/components/dashboard/useDashboardWorker";
import { DEFAULT_DASHBOARD_CONFIG } from "@/lib/dashboardConfig";
import {
  createInitialDashboardState,
  parseInitialDimensionAggregates,
} from "@/lib/initialDashboardState";
import type { DashboardConfig, DimensionId, WorkerStatePayload } from "@/lib/dashboardTypes";

type Props = {
  dataUrl: string;
  config?: DashboardConfig;
  initialStateUrl?: string;
  jsonPath?: string;
};

export function CrossfilterDashboard({
  config = DEFAULT_DASHBOARD_CONFIG,
  dataUrl,
  initialStateUrl,
  jsonPath = ".",
}: Props) {
  const { dashboardState, error, progress, send, status } = useDashboardWorker(
    dataUrl,
    jsonPath,
    config,
  );
  const { initialState, initialStateError } = useInitialDashboardState(initialStateUrl, config);
  const [expandedDimensionId, setExpandedDimensionId] = useState<DimensionId | null>(null);
  const displayState = dashboardState ?? initialState;
  const canFilter = Boolean(dashboardState) && status === "ready";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedDimensionId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filterCount = selectedCount(displayState?.activeFilters ?? {});

  const filterEntries = useMemo(() => {
    const active = displayState?.activeFilters ?? {};
    return Object.entries(active) as Array<[DimensionId, string[]]>;
  }, [displayState?.activeFilters]);

  const dimensionLabels = useMemo(() => {
    return new Map(config.dimensions.map((item) => [item.id, item.label]));
  }, [config]);

  const dimensionLookups = useMemo(() => {
    return new Map(config.dimensions.map((item) => [item.id, item.lookup]));
  }, [config]);

  const dimensionValueLabels = useMemo(() => {
    const labels = new Map<DimensionId, Map<string, string>>();

    for (const dimension of displayState?.dimensions ?? []) {
      labels.set(
        dimension.id,
        new Map(dimension.allValues.map((item) => [item.key, item.label])),
      );
    }

    return labels;
  }, [displayState?.dimensions]);

  const getValueLabel = useCallback(
    (dimensionId: DimensionId, value: string) => {
      const lookup = dimensionLookups.get(dimensionId);

      if (!lookup) {
        return dimensionValueLabels.get(dimensionId)?.get(value) ?? value;
      }

      if (typeof lookup === "function") {
        return lookup(value) ?? value;
      }

      return lookup[value] ?? dimensionValueLabels.get(dimensionId)?.get(value) ?? value;
    },
    [dimensionLookups, dimensionValueLabels],
  );

  const expandedSummary = useMemo(() => {
    return displayState?.dimensions.find((item) => item.id === expandedDimensionId) ?? null;
  }, [displayState?.dimensions, expandedDimensionId]);

  return (
    <Box component="main" mih="100vh" bg="gray.0" c="ink.9">
      <Stack maw={1800} mx="auto" gap="md" px={{ base: "md", sm: "xl" }} py="md">
        <DashboardHeader
          status={status}
          progress={progress}
          filterCount={filterCount}
          onClearFilters={() => {
            if (canFilter) {
              send({ type: "clearAllFilters" });
            }
          }}
        />

        {status === "error" ? (
          <ErrorState message={error ?? "Unable to load the dataset."} />
        ) : null}

        {initialStateError && !initialState && status === "loading" ? (
          <ErrorState message={initialStateError} />
        ) : null}

        {status === "loading" && !displayState ? <LoadingState progress={progress} /> : null}

        {displayState ? (
          <>
            <MetricStrip state={displayState} />
            <ActiveFiltersBar
              dimensionLabels={dimensionLabels}
              entries={filterEntries}
              getValueLabel={getValueLabel}
              onClearFilter={(dimensionId) => {
                if (canFilter) {
                  send({ type: "clearFilter", dimensionId });
                }
              }}
              onRemoveValue={(dimensionId, value) => {
                if (canFilter) {
                  send({ type: "toggleFilter", dimensionId, value });
                }
              }}
            />
            <SimpleGrid cols={{ base: 1, lg: 2, xl: 3 }} spacing="md">
              {displayState.dimensions.map((summary) => (
                <DimensionChartCard
                  key={summary.id}
                  summary={summary}
                  canFilter={canFilter}
                  onShowAll={() => setExpandedDimensionId(summary.id)}
                  onToggle={(dimensionId, value) => {
                    if (canFilter) {
                      send({ type: "toggleFilter", dimensionId, value });
                    }
                  }}
                />
              ))}
            </SimpleGrid>
            {expandedSummary ? (
              <FullOptionsModal
                summary={expandedSummary}
                canFilter={canFilter}
                onClose={() => setExpandedDimensionId(null)}
                onToggle={(dimensionId, value) => {
                  if (canFilter) {
                    send({ type: "toggleFilter", dimensionId, value });
                  }
                }}
              />
            ) : null}
          </>
        ) : null}
      </Stack>
    </Box>
  );
}

function useInitialDashboardState(
  initialStateUrl: string | undefined,
  config: DashboardConfig,
) {
  const [initialState, setInitialState] = useState<{
    payload: WorkerStatePayload;
    url: string;
  } | null>(null);
  const [initialStateError, setInitialStateError] = useState<{
    message: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!initialStateUrl) {
      return;
    }

    const controller = new AbortController();

    fetch(initialStateUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Initial dashboard state request failed with ${response.status}`);
        }

        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        setInitialState({
          payload: createInitialDashboardState(
            parseInitialDimensionAggregates(payload),
            config,
          ),
          url: initialStateUrl,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setInitialStateError({
          message:
            error instanceof Error ? error.message : "Unable to load initial dashboard state.",
          url: initialStateUrl,
        });
      });

    return () => controller.abort();
  }, [config, initialStateUrl]);

  const matchingInitialState =
    initialState && initialState.url === initialStateUrl ? initialState.payload : null;
  const matchingInitialStateError =
    initialStateError && initialStateError.url === initialStateUrl
      ? initialStateError.message
      : null;

  return {
    initialState: matchingInitialState,
    initialStateError: matchingInitialStateError,
  };
}
