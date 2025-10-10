"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  X,
  Home,
  MessageSquare,
  BarChart3,
  Users,
  Settings,
  Shield,
  FileText,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SimpleThemeToggle } from "@/components/ui/theme-toggle";
import { useNavigationLoader } from "@/components/providers/navigation-loader-provider";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
  adminOnly?: boolean;
}

const navigationItems: NavItem[] = [
  {
    title: "Home",
    href: "/",
    icon: Home,
    description: "Dashboard overview",
  },
  {
    title: "Chat",
    href: "/chat",
    icon: MessageSquare,
    description: "AI conversations",
    badge: "New",
  },
  // Admin items - HIDDEN
  // {
  //   title: "Analytics",
  //   href: "/admin/analytics",
  //   icon: BarChart3,
  //   description: "Usage insights",
  //   adminOnly: true,
  // },
  // {
  //   title: "Users",
  //   href: "/admin/users",
  //   icon: Users,
  //   description: "User management",
  //   adminOnly: true,
  // },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "App settings",
  },
];

interface MobileNavProps {
  className?: string;
  isAdmin?: boolean;
}

export function MobileNav({ className, isAdmin = false }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNavigation } = useNavigationLoader();
  const currentSearch = searchParams.toString();
  const currentLocation = currentSearch ? `${pathname}?${currentSearch}` : pathname;

  const filteredItems = navigationItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const handleItemClick = (href: string) => {
    setIsOpen(false);

    if (href === currentLocation) {
      return;
    }

    startNavigation();
  };

  return (
    <div className={cn("md:hidden", className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">LIA App</h2>
                  <p className="text-xs text-muted-foreground">AI Platform</p>
                </div>
              </div>
              <SimpleThemeToggle />
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-1">
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => handleItemClick(item.href)}
                      className={cn(
                        "flex items-center space-x-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Admin Tools - HIDDEN */}
              {/* {isAdmin && (
                <>
                  <Separator className="mx-4" />
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Admin Tools
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/admin"
                        onClick={handleItemClick}
                        className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </Link>
                      <Link
                        href="/admin/content"
                        onClick={handleItemClick}
                        className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Content Management</span>
                      </Link>
                    </div>
                  </div>
                </>
              )} */}
            </div>

            {/* Footer */}
            <div className="border-t p-4">
              <div className="text-xs text-muted-foreground text-center">
                <p>AI Platform v1.0</p>
                <p className="mt-1">© 2024 LIA App</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Mobile bottom navigation for quick access
export function MobileBottomNav({ className }: { className?: string }) {
  const pathname = usePathname();

  const quickNavItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Chat", href: "/chat", icon: MessageSquare },
    { title: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden",
        className
      )}
    >
      <div className="flex items-center justify-around px-4 py-2">
        {quickNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center space-y-1 p-2 rounded-lg min-w-0 flex-1",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
