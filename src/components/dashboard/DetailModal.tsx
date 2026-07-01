import { Modal, ScrollArea, Table, Text, Title } from "@mantine/core";
import type { DimensionConfig } from "@/lib/dashboardTypes";

type DetailModalProps = {
  dimensions: DimensionConfig[];
  opened: boolean;
  onClose: () => void;
};

const dummyRows = [
  {
    adjudicationLocationCode: "LIN",
    atNBC: "Yes",
    caseSubstatusCode: "8",
    channelTypeCode: "30",
    currentLocationCode: "LAX",
    fcoLocationCode: "MSC",
    filingCategoryCode: "106",
    isRemoteInd: "Yes",
    milnatzInd: "Yes",
    uscisReceiptDate: "01-2020",
  },
  {
    adjudicationLocationCode: "EAC",
    atNBC: "No",
    caseSubstatusCode: "7",
    channelTypeCode: "50",
    currentLocationCode: "CHI",
    fcoLocationCode: "IOE",
    filingCategoryCode: "105",
    isRemoteInd: "No",
    milnatzInd: "No",
    uscisReceiptDate: "02-2020",
  },
];

export function DetailModal({ dimensions, opened, onClose }: DetailModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <>
          <Title order={2} size="h3" c="ink.9">
            Detail
          </Title>
          <Text size="sm" c="dimmed">
            Sample rows
          </Text>
        </>
      }
      size="95vw"
      centered
      radius="md"
      overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
    >
      <ScrollArea.Autosize mah="68vh">
        <Table striped highlightOnHover withTableBorder withColumnBorders miw={1200}>
          <Table.Thead>
            <Table.Tr>
              {dimensions.map((dimension) => (
                <Table.Th key={dimension.id}>{dimension.label}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {dummyRows.map((row, index) => (
              <Table.Tr key={index}>
                {dimensions.map((dimension) => (
                  <Table.Td key={dimension.id}>
                    {row[dimension.id as keyof typeof row] ?? "-"}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>
    </Modal>
  );
}
