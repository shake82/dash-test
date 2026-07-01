import { Button, Group, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { Database, Download, RotateCcw, Table } from "lucide-react";
import type { WorkerLoadProgress } from "@/lib/dashboardTypes";
import type { LoadStatus } from "./formatters";
import { StatusBadge } from "./StatusStates";

const DOWNLOAD_LIMIT = 200_000;

type DashboardHeaderProps = {
  status: LoadStatus;
  progress: WorkerLoadProgress;
  filterCount: number;
  filteredTotal: number | null;
  onClearFilters: () => void;
  onViewDetail: () => void;
};

export function DashboardHeader({
  status,
  progress,
  filterCount,
  filteredTotal,
  onClearFilters,
  onViewDetail,
}: DashboardHeaderProps) {
  const canDownload =
    status === "ready" && filteredTotal !== null && filteredTotal <= DOWNLOAD_LIMIT;

  return (
    <Group
      component="header"
      justify="space-between"
      align="flex-end"
      gap="md"
      pb="md"
      style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
    >
      <Stack gap={6}>
        <Group gap={8}>
          <ThemeIcon color="teal" variant="light" size={28} radius="md">
            <Database size={18} aria-hidden="true" />
          </ThemeIcon>
          <Text size="sm" fw={600} c="teal.8">
            Crossfilter analytics
          </Text>
        </Group>
        <Title order={1} size="h2" c="ink.9">
          Dimension dashboard
        </Title>
      </Stack>
      <Group gap="xs">
        <StatusBadge status={status} progress={progress} />
        <Tooltip
          label="Reduce the selection to a manageable size of 200,000 items or fewer."
          disabled={canDownload}
          openDelay={250}
          withArrow
        >
          <span>
            <Button
              variant="default"
              size="sm"
              leftSection={<Download size={16} aria-hidden="true" />}
              disabled={!canDownload}
              title="Download"
            >
              Download
            </Button>
          </span>
        </Tooltip>
        <Button
          variant="default"
          size="sm"
          leftSection={<Table size={16} aria-hidden="true" />}
          onClick={onViewDetail}
          disabled={status !== "ready"}
          title="View detail"
        >
          View Detail
        </Button>
        <Button
          variant="default"
          size="sm"
          leftSection={<RotateCcw size={16} aria-hidden="true" />}
          onClick={onClearFilters}
          disabled={!filterCount || status !== "ready"}
          title="Clear filters"
        >
          Clear
        </Button>
      </Group>
    </Group>
  );
}
