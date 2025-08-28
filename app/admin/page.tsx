"use server";

import { Suspense } from "react";
import { DashboardOverview } from "../(dashboard)/_components/dashboard-overview";
import { DashboardSkeleton } from "../(dashboard)/_components/dashboard-skeleton";
import { Shield } from "lucide-react";

export default async function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground">
            Monitor and manage your AI platform
          </p>
        </div>
      </div>

      {/* Dashboard Overview */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardOverview />
      </Suspense>
    </div>
  );
}
