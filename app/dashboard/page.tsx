"use client";

import { Suspense } from "react";
import { DashboardOverview } from "../(dashboard)/_components/dashboard-overview";
import { DashboardSkeleton } from "../(admin)/_components/dashboard-skeleton";
import { DashboardLayout } from "@/components/layout/app-layout";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your AI platform activity
            </p>
          </div>
        </div>

        {/* Dashboard Overview */}
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardOverview />
        </Suspense>
        </div>
      </div>
    </DashboardLayout>
  );
}
