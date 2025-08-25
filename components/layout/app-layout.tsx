"use client";

import { useState } from "react";
import { Header } from "@/components/shared/header";
import { Sidebar } from "@/components/shared/sidebar";
import { Footer } from "@/components/shared/footer";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/shared/loading";
import { cn } from "@/lib/utils";
import { Bot, Menu } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function AppLayout({
  children,
  className,
  showSidebar = false,
  showHeader = true,
  showFooter = true,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Initializing application..." />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Header - only show when not using sidebar */}
        {showHeader && !showSidebar && (
          <Header onMobileMenuToggle={() => setSidebarOpen(true)} />
        )}

        <div className="flex">
          {/* Desktop Sidebar */}
          {showSidebar && (
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:top-0 md:z-50 md:border-r">
              <Sidebar />
            </aside>
          )}

          {/* Mobile Sidebar */}
          {showSidebar && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side="left" className="p-0 w-64">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>
                    Mobile navigation sidebar for accessing different sections
                    of the application.
                  </SheetDescription>
                </SheetHeader>
                <Sidebar />
              </SheetContent>
            </Sheet>
          )}

          {/* Mobile Header for sidebar layouts */}
          {showSidebar && (
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b h-14 flex items-center px-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
              <div className="ml-2 flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                <span className="font-bold">LIA App</span>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main
            className={cn(
              "flex-1 flex flex-col min-h-screen overflow-hidden",
              showHeader && !showSidebar
                ? "min-h-[calc(100vh-3.5rem)]"
                : showSidebar
                ? "min-h-screen md:pl-64 pt-14 md:pt-0"
                : "min-h-screen",
              className
            )}
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 h-full flex flex-col">
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
    <AppLayout showSidebar={true} showHeader={false} showFooter={false}>
      {children}
    </AppLayout>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout
      showSidebar={false}
      showHeader={true}
      showFooter={true}
      className="flex items-center justify-center"
    >
      <div className="w-full max-w-md">{children}</div>
    </AppLayout>
  );
}

export function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout showSidebar={false} showHeader={true} showFooter={true}>
      {children}
    </AppLayout>
  );
}
