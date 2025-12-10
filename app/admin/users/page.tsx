import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { UsersPageShell } from "./users-page-shell";
import { UsersPageStats } from "./users-page-stats";
import { UsersPageTable } from "./users-page-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function AdminUsersPage() {
  // Server-side auth check happens BEFORE streaming
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/signin");
  }

  if (currentUser.role !== "admin") {
    redirect("/");
  }

  // Render shell immediately, stream data
  return (
    <UsersPageShell>
      {/* Stats stream in first (usually faster query) */}
      <Suspense fallback={<StatsSkeletons />}>
        <UsersPageStats />
      </Suspense>

      {/* Table streams in second */}
      <Suspense fallback={<TableSkeleton />}>
        <UsersPageTable />
      </Suspense>
    </UsersPageShell>
  );
}

// Skeleton components for streaming fallbacks
function StatsSkeletons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1"></div>
            <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="flex-shrink-0">
        <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2"></div>
        <div className="h-4 w-64 bg-muted animate-pulse rounded"></div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
