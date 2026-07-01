interface Data {
  data: DataRow[];
}

interface DataRow {
  caseSubstatusCode: number;
  filingCategoryCode: number;
  atNBC: boolean;
  total: number;
  milnatzInd: "Y" | "N";
  uscisReceiptDate: string;
  channelTypeCode: number;
  currentLocationCode: string;
  fcoLocationCode: string;
  adjudicationLocationCode: string;
  isRemoteInd: "Y" | "N";
}

const caseSubstatusCodes = [1, 2, 3, 4, 5, 6, 7, 8];
const filingCategoryCodes = [101, 102, 103, 104, 105, 106];
const channelTypeCodes = [10, 20, 30, 40, 50];
const locationCodes = [
  "NBC",
  "MSC",
  "IOE",
  "LIN",
  "SRC",
  "WAC",
  "EAC",
  "YSC",
  "FCO",
  "ATL",
  "CHI",
  "DAL",
  "HOU",
  "LAX",
  "NYC",
  "SEA",
];

const receiptYears = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
const receiptYearWeightTotal = receiptYears.reduce((sum, _, index) => sum + index + 1, 0);

const pick = <T,>(items: T[], index: number, salt: number) => {
  return items[(index * salt + salt) % items.length];
};

const getDaysInYear = (year: number) => {
  return new Date(Date.UTC(year + 1, 0, 0)).getUTCDate();
};

const getReceiptYear = (index: number, count: number) => {
  const weightedPosition = ((index + 0.5) / count) * receiptYearWeightTotal;
  let cumulativeWeight = 0;

  for (let yearIndex = 0; yearIndex < receiptYears.length; yearIndex += 1) {
    cumulativeWeight += yearIndex + 1;

    if (weightedPosition <= cumulativeWeight) {
      return receiptYears[yearIndex];
    }
  }

  return receiptYears[receiptYears.length - 1];
};

const getReceiptDate = (index: number, count: number) => {
  const year = getReceiptYear(index, count);
  const dayOffset = index % getDaysInYear(year);

  return new Date(Date.UTC(year, 0, 1 + dayOffset));
};

const buildRows = (count: number): DataRow[] => {
  return Array.from({ length: count }, (_, index) => {
    const receiptDate = getReceiptDate(index, count);

    return {
      caseSubstatusCode: pick(caseSubstatusCodes, index, 7),
      filingCategoryCode: pick(filingCategoryCodes, index, 11),
      atNBC: index % 3 === 0,
      total: 1 + ((index * 37) % 250),
      milnatzInd: index % 5 === 0 ? "Y" : "N",
      uscisReceiptDate: receiptDate.toISOString().slice(0, 10),
      channelTypeCode: pick(channelTypeCodes, index, 7),
      currentLocationCode: pick(locationCodes, index, 13),
      fcoLocationCode: pick(locationCodes, index, 17),
      adjudicationLocationCode: pick(locationCodes, index, 19),
      isRemoteInd: index % 4 === 0 ? "Y" : "N",
    };
  });
};

export async function GET() {
  const data: Data = {
    data: buildRows(25000),
  };
  const body = JSON.stringify(data);
  const byteLength = new TextEncoder().encode(body).byteLength;

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-length": String(byteLength),
      "content-type": "application/json; charset=utf-8",
    },
  });
}
