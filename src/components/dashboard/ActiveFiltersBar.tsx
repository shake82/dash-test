import { ActionIcon, Button, Group, Paper, Text } from "@mantine/core";
import { FilterX, X } from "lucide-react";
import type { DimensionId } from "@/lib/dashboardTypes";

type ActiveFiltersBarProps = {
  entries: Array<[DimensionId, string[]]>;
  dimensionLabels: Map<DimensionId, string>;
  getValueLabel: (dimensionId: DimensionId, value: string) => string;
  onClearFilter: (dimensionId: DimensionId) => void;
  onRemoveValue: (dimensionId: DimensionId, value: string) => void;
};

export function ActiveFiltersBar({
  dimensionLabels,
  entries,
  getValueLabel,
  onClearFilter,
  onRemoveValue,
}: ActiveFiltersBarProps) {
  if (entries.length === 0) {
    return (
      <Paper
        component="section"
        withBorder
        p="sm"
        radius="md"
        bg="white"
        style={{ borderStyle: "dashed" }}
      >
        <Group gap="xs" c="dimmed" mih={28}>
          <FilterX size={16} aria-hidden="true" />
          <Text size="sm">No active filters</Text>
        </Group>
      </Paper>
    );
  }

  return (
    <Paper component="section" withBorder shadow="xs" p="sm" radius="md" bg="white">
      <Group gap="xs">
        {entries.map(([dimensionId, values]) => (
          <Paper
            key={dimensionId}
            bg="gray.1"
            radius="md"
            px={8}
            py={6}
            style={{ flexShrink: 1 }}
          >
            <Group gap={6}>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                {dimensionLabels.get(dimensionId) ?? dimensionId}
              </Text>
              {values.map((value) => {
                const label = getValueLabel(dimensionId, value);

                return (
                  <Button
                    key={value}
                    variant="white"
                    color="gray"
                    size="compact-xs"
                    rightSection={<X size={13} aria-hidden="true" />}
                    onClick={() => onRemoveValue(dimensionId, value)}
                    title={`Remove ${label}`}
                    styles={{
                      label: {
                        maxWidth: 240,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      },
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => onClearFilter(dimensionId)}
                title={`Clear ${dimensionLabels.get(dimensionId) ?? dimensionId}`}
              >
                <FilterX size={15} aria-hidden="true" />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
      </Group>
    </Paper>
  );
}
