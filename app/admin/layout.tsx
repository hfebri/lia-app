import { DashboardLayout } from "@/components/layout/app-layout";
import { AdminGuard } from "@/components/auth/admin-guard";

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
