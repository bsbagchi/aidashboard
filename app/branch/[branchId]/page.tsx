import { notFound } from "next/navigation";
import { Suspense } from "react";
import dealershipData from "@/doc/dealership_data.json";
import { BranchDetail } from "@/components/dealer-pulse/branch-detail";
import type { DealershipDataset } from "@/lib/dealership/types";

function Fallback() {
  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-100 p-8 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
      Loading branch…
    </div>
  );
}

export default async function BranchPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const data = dealershipData as DealershipDataset;
  if (!data.branches.some((b) => b.id === branchId)) {
    notFound();
  }
  return (
    <Suspense fallback={<Fallback />}>
      <BranchDetail data={data} branchId={branchId} />
    </Suspense>
  );
}
