import { Button, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { Database, RotateCcw } from "lucide-react";
import type { WorkerLoadProgress } from "@/lib/dashboardTypes";
import type { LoadStatus } from "./formatters";
import { StatusBadge } from "./StatusStates";

type DashboardHeaderProps = {
  status: LoadStatus;
  progress: WorkerLoadProgress;
  filterCount: number;
  onClearFilters: () => void;
};

export function DashboardHeader({
  status,
  progress,
  filterCount,
  onClearFilters,
}: DashboardHeaderProps) {
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
