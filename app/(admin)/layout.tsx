import { DashboardLayout } from "@/components/layout/app-layout";
import { AdminGuard } from "@/components/auth/admin-guard";
import { AdminNav } from "@/components/admin/admin-nav";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function AdminLayoutRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          {/* Admin Sidebar */}
          <div className="hidden lg:flex lg:w-64 lg:flex-col">
            <div className="flex flex-col flex-1 min-h-0 border-r bg-background">
              <AdminNav className="flex-1" />
            </div>
          </div>

          {/* Main Content */}
          <SidebarInset className="flex-1">
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 relative overflow-y-auto focus:outline-none">
                <div className="py-6 px-4 sm:px-6 lg:px-8">{children}</div>
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AdminGuard>
  );
}
