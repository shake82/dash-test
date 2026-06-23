import { CrossfilterDashboard } from "@/components/CrossfilterDashboard";

export default function Home() {
  return <CrossfilterDashboard dataUrl="/api/dashboard-data" />;
}
