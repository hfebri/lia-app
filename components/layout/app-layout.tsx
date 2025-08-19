"use client";

import { useState } from "react";
import { Header } from "@/components/shared/header";
import { Sidebar } from "@/components/shared/sidebar";
import { Footer } from "@/components/shared/footer";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingPage } from "@/components/shared/loading";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  showSidebar?: boolean;
  showFooter?: boolean;
}

export function AppLayout({
  children,
  className,
  showSidebar = true,
  showFooter = true,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingPage message="Initializing application..." />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <Header onMobileMenuToggle={() => setSidebarOpen(true)} />

        <div className="flex">
          {/* Desktop Sidebar */}
          {showSidebar && (
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:top-14 md:z-50 md:border-r">
              <Sidebar />
            </aside>
          )}

          {/* Mobile Sidebar */}
          {showSidebar && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar />
              </SheetContent>
            </Sheet>
          )}

          {/* Main Content */}
          <main
            className={cn(
              "flex-1 min-h-[calc(100vh-3.5rem)]",
              showSidebar && "md:pl-64",
              className
            )}
          >
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Footer */}
        {showFooter && <Footer />}
      </div>
    </ErrorBoundary>
  );
}

// Specialized layouts for different sections
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout showSidebar={true} showFooter={false}>
      {children}
    </AppLayout>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout
      showSidebar={false}
      showFooter={true}
      className="flex items-center justify-center"
    >
      <div className="w-full max-w-md">{children}</div>
    </AppLayout>
  );
}

export function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout showSidebar={false} showFooter={true}>
      {children}
    </AppLayout>
  );
}
