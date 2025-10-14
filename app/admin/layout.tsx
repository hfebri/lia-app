import { DashboardLayout } from "@/components/layout/app-layout";
import { AdminGuard } from "@/components/auth/admin-guard";

// Force dynamic rendering since DashboardLayout uses useSearchParams
export const dynamic = "force-dynamic";

export default function AdminLayoutRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </AdminGuard>
  );
}
