import { DashboardLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function DashboardLayoutRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}
