import { notFound } from "next/navigation";
import { Suspense } from "react";
import dealershipData from "@/doc/dealership_data.json";
import { RepDetail } from "@/components/dealer-pulse/rep-detail";
import type { DealershipDataset } from "@/lib/dealership/types";

function Fallback() {
  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-100 p-8 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
      Loading rep…
    </div>
  );
}

export default async function RepPage({
  params,
}: {
  params: Promise<{ repId: string }>;
}) {
  const { repId } = await params;
  const data = dealershipData as DealershipDataset;
  if (!data.sales_reps.some((r) => r.id === repId)) {
    notFound();
  }
  return (
    <Suspense fallback={<Fallback />}>
      <RepDetail data={data} repId={repId} />
    </Suspense>
  );
}
