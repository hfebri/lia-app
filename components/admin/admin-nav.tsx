"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Shield,
  Settings,
  FileText,
  MessageSquare,
  Database,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AdminNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navigationItems: AdminNavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: BarChart3,
    description: "Overview and key metrics",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: Activity,
    description: "Usage statistics and insights",
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    description: "Manage users and permissions",
  },
  {
    title: "Content Management",
    href: "/admin/content",
    icon: FileText,
    description: "Manage conversations and files",
  },
  {
    title: "System Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "System configuration",
  },
];

const quickActions: AdminNavItem[] = [
  {
    title: "Chat Interface",
    href: "/chat",
    icon: MessageSquare,
    description: "Go to chat",
  },
  {
    title: "Database",
    href: "/admin/database",
    icon: Database,
    description: "Database management",
  },
];

interface AdminNavProps {
  className?: string;
}

export function AdminNav({ className }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col space-y-2 p-4", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground px-2 mb-2">
          Admin Dashboard
        </h3>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{item.title}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <Separator className="my-4" />

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground px-2 mb-2">
          Quick Actions
        </h3>
        {quickActions.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{item.title}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <Separator className="my-4" />

      <div className="space-y-1">
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Shield className="h-4 w-4 mr-2" />
          Admin Settings
        </Button>
      </div>
    </nav>
  );
}
