import { Suspense } from "react";
import dealershipData from "@/doc/dealership_data.json";
import { DealershipDashboard } from "@/components/dealer-pulse/dealership-dashboard";
import type { DealershipDataset } from "@/lib/dealership/types";

function DashboardFallback() {
  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-100 p-8 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
      Loading dashboard…
    </div>
  );
}

export default function Home() {
  const data = dealershipData as DealershipDataset;
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DealershipDashboard data={data} />
    </Suspense>
  );
}
