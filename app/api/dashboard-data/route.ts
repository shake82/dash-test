import type { DataRow } from "@/lib/dashboardTypes";

const regions = [
  "North America",
  "Europe",
  "Asia Pacific",
  "Latin America",
  "Middle East",
  "Africa",
];
const categories = [
  "Analytics",
  "Automation",
  "Collaboration",
  "Security",
  "Infrastructure",
  "Services",
];
const products = [
  "Atlas",
  "Beacon",
  "Compass",
  "Delta",
  "Echo",
  "Flux",
  "Helio",
  "Ion",
  "Juno",
  "Keystone",
  "Lumen",
  "Matrix",
  "Nova",
  "Orbit",
  "Pulse",
  "Quartz",
  "Relay",
  "Signal",
  "Terra",
  "Vector",
  "Wave",
  "Zenith",
];
const channels = ["Direct", "Partner", "Marketplace", "Inside Sales", "Field"];
const segments = [
  "Enterprise",
  "Mid-Market",
  "Small Business",
  "Strategic",
  "Public Sector",
];
const statuses = ["Won", "Expansion", "Renewal", "At Risk", "Trial"];
const quarters = ["2025 Q1", "2025 Q2", "2025 Q3", "2025 Q4", "2026 Q1", "2026 Q2"];
const owners = [
  "Avery Stone",
  "Blair Kim",
  "Casey Morgan",
  "Dev Patel",
  "Emery Singh",
  "Finley Ross",
  "Gray Chen",
  "Harper Lee",
  "Indigo Cruz",
  "Jordan Reed",
  "Kai Brooks",
  "Logan Price",
  "Morgan Bell",
  "Nico Shah",
  "Parker Wells",
  "Quinn Fox",
  "Riley Young",
  "Sawyer Hayes",
  "Taylor Lane",
  "Val Ortiz",
];

const pick = <T,>(items: T[], index: number, salt: number) => {
  return items[(index * salt + salt) % items.length];
};

const buildRows = (count: number): DataRow[] => {
  return Array.from({ length: count }, (_, index) => {
    const region = pick(regions, index, 7);
    const category = pick(categories, index, 11);
    const product = pick(products, index, 13);
    const channel = pick(channels, index, 5);
    const segment = pick(segments, index, 17);
    const status = pick(statuses, index, 19);
    const quarter = pick(quarters, index, 23);
    const owner = pick(owners, index, 29);
    const multiplier =
      1 +
      regions.indexOf(region) * 0.08 +
      categories.indexOf(category) * 0.06 +
      (status === "Won" ? 0.55 : status === "At Risk" ? -0.28 : 0);
    const units = 8 + ((index * 37) % 142);
    const revenue = Math.max(
      1200,
      Math.round((units * (240 + ((index * 97) % 1900)) * multiplier) / 10) *
        10,
    );

    return {
      id: `row-${index + 1}`,
      region,
      category,
      product,
      channel,
      segment,
      status,
      quarter,
      owner,
      revenue,
      units,
      satisfaction: 56 + ((index * 31 + statuses.indexOf(status) * 7) % 44),
    };
  });
};

export async function GET() {
  const body = JSON.stringify(buildRows(25000));
  const byteLength = new TextEncoder().encode(body).byteLength;

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-length": String(byteLength),
      "content-type": "application/json; charset=utf-8",
    },
  });
}
