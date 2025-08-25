"use client";

import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/app-layout";
import { Suspense } from "react";
import { DashboardOverview } from "./(dashboard)/_components/dashboard-overview";
import { DashboardSkeleton } from "./(dashboard)/_components/dashboard-skeleton";

function HomePage() {

  // TEMPORARY: Show dashboard for everyone (bypass authentication)
  // For now, always show the dashboard
  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s an overview of your activity.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit h-fit shrink-0">
          🚀 Testing Mode
        </Badge>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardOverview />
      </Suspense>
    </div>
  );
}

export default function Home() {
  return (
    <DashboardLayout>
      <HomePage />
    </DashboardLayout>
  );
}
