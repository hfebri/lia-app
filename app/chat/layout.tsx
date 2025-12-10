import { DashboardLayout as DashboardLayoutWrapper } from "@/components/layout/app-layout";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
