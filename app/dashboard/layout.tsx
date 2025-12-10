import { DashboardLayout as DashboardLayoutWrapper } from "@/components/layout/app-layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
