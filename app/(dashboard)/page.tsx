"use server";

import { Suspense } from "react";
import { DashboardOverview } from "./_components/dashboard-overview";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";

export default async function DashboardPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardOverview />
      </Suspense>
    </div>
  );
}
