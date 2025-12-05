import { DashboardSkeleton } from "../admin/_components/dashboard-skeleton";

export default function Loading() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    </div>
  );
}
