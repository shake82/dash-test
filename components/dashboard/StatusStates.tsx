import {
  Alert,
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { WorkerLoadProgress } from "@/lib/dashboardTypes";
import type { LoadStatus } from "./formatters";
import { getProgressLabel } from "./formatters";

type StatusBadgeProps = {
  status: LoadStatus;
  progress: WorkerLoadProgress;
};

export function StatusBadge({ status, progress }: StatusBadgeProps) {
  const label = status === "ready" ? "Ready" : getProgressLabel(progress);
  const color = status === "error" ? "red" : status === "ready" ? "teal" : "blue";

  return (
    <Badge
      color={color}
      variant="light"
      size="lg"
      radius="md"
      leftSection={
        status === "loading" ? (
          <Loader size={14} color={color} aria-hidden="true" />
        ) : (
          <Box w={9} h={9} bg={`${color}.6`} style={{ borderRadius: 999 }} aria-hidden="true" />
        )
      }
      tt="none"
    >
      {label}
    </Badge>
  );
}

export function LoadingState({ progress }: { progress: WorkerLoadProgress }) {
  const hasPercent = typeof progress.percent === "number";

  return (
    <Paper component="section" withBorder shadow="xs" p="xl" radius="md" mih="58vh">
      <Center h="100%">
        <Stack w="100%" maw={560} gap="md">
          <Stack gap={4}>
            <Text size="sm" fw={700} tt="uppercase" c="dimmed">
              Dataset load
            </Text>
            <Title order={2} size="h2" c="ink.9">
              {getProgressLabel(progress)}
            </Title>
          </Stack>
          <Progress
            value={hasPercent ? progress.percent ?? 0 : 50}
            size="md"
            radius="xl"
            striped={!hasPercent}
            animated={!hasPercent}
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {progress.stage}
            </Text>
            <Text size="sm" c="dimmed">
              {hasPercent ? `${progress.percent}%` : "Working"}
            </Text>
          </Group>
        </Stack>
      </Center>
    </Paper>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Alert component="section" color="red" variant="light" radius="md">
      {message}
    </Alert>
  );
}
