"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { NavigationLoaderProvider } from "@/components/providers/navigation-loader-provider";
import { usePathname, useSearchParams } from "next/navigation";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  showSidebar?: boolean;
  showFooter?: boolean;
}

export function AppLayout({
  children,
  className,
  showSidebar = false,
  showFooter = true,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationStartedAt, setNavigationStartedAt] = useState<number | null>(
    null
  );

  const startNavigation = useCallback(() => {
    setNavigationStartedAt(Date.now());
    setIsNavigating(true);
  }, []);

  const searchKey = searchParams.toString();

  useEffect(() => {
    if (!navigationStartedAt) {
      return;
    }

    const minimumDuration = 350;
    const elapsed = Date.now() - navigationStartedAt;
    const remaining = Math.max(minimumDuration - elapsed, 0);

    const timeout = window.setTimeout(() => {
      setIsNavigating(false);
      setNavigationStartedAt(null);
    }, remaining);

    return () => window.clearTimeout(timeout);
  }, [pathname, searchKey, navigationStartedAt]);

  useEffect(() => {
    if (!isNavigating) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsNavigating(false);
      setNavigationStartedAt(null);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [isNavigating]);

  // Memoize the sidebar component to prevent unnecessary re-renders
  const memoizedSidebar = useMemo(() => <Sidebar />, []);

  const navigationContextValue = useMemo(
    () => ({
      isNavigating,
      startNavigation,
    }),
    [isNavigating, startNavigation]
  );

  if (isLoading) {
    console.log("[APP-LAYOUT] auth loading - showing initializing page");
    return <LoadingPage message="Initializing application..." />;
  }

  return (
    <NavigationLoaderProvider value={navigationContextValue}>
      <ErrorBoundary>
        <div className="h-screen bg-background overflow-hidden">
          <div className="flex h-full w-full overflow-hidden">
            {/* Desktop Sidebar */}
            {showSidebar && (
              <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:top-0 md:z-50 md:border-r md:bg-background">
                {memoizedSidebar}
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
                  {memoizedSidebar}
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
                  <span className="font-bold">LIA</span>
                </div>
              </div>
            )}

            {/* Main Content */}
            <main
              className={cn(
                "relative flex-1 flex flex-col h-screen min-w-0",
                showSidebar ? "pt-14 md:pt-0 md:pl-64" : "px-6",
                className
              )}
            >
              <div className="flex-1 h-full overflow-hidden w-full">
                <ErrorBoundary>{children}</ErrorBoundary>
              </div>
            </main>
          </div>

          {/* Footer */}
          {showFooter && <Footer />}
        </div>
      </ErrorBoundary>
    </NavigationLoaderProvider>
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
