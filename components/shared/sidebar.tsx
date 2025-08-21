"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-conversations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  MessageSquare,
  FileText,
  Settings,
  BarChart3,
  Users,
  Shield,
  Home,
  Plus,
  Clock,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    title: "Chat",
    href: "/chat",
    icon: MessageSquare,
  },
];

const adminItems: NavItem[] = [
  {
    title: "Admin Dashboard",
    href: "/admin",
    icon: BarChart3,
    adminOnly: true,
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    adminOnly: true,
  },

  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    adminOnly: true,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { conversations, createConversation, isLoading } = useConversations();

  // Helper function to check user role
  const hasRole = (role: string) => {
    return user?.role === role;
  };

  // Create new conversation
  const handleNewChat = async () => {
    try {
      const newConversation = await createConversation({
        title: "New Chat",
      });
      if (newConversation) {
        // Navigate to the new conversation
        window.location.href = `/chat?conversation=${newConversation.id}`;
      }
    } catch (error) {
      console.error("Failed to create new conversation:", error);
    }
  };

  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        {/* Logo */}
        <div className="px-3 py-2">
          <Link href="/" className="flex items-center pl-3 mb-14">
            <Bot className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-bold">LIA App</h1>
          </Link>
        </div>

        {/* Navigation */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Navigation
          </h2>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.href}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.title}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Chat History */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2 px-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Chat History
            </h2>
            <Button
              onClick={handleNewChat}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-48">
            <div className="space-y-1">
              {conversations.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No conversations yet
                  </p>
                  <Button
                    onClick={handleNewChat}
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={isLoading}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Start Chat
                  </Button>
                </div>
              ) : (
                conversations.slice(0, 10).map((conversation) => (
                  <Button
                    key={conversation.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2 text-left"
                    asChild
                  >
                    <Link href={`/chat?conversation=${conversation.id}`}>
                      <div className="flex items-start gap-2 w-full">
                        <Clock className="h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {conversation.title || "Untitled Chat"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              conversation.createdAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Admin Section */}
        {user && hasRole("admin") && (
          <>
            <Separator className="mx-3" />
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                <div className="flex items-center">
                  Administration
                  <Shield className="ml-2 h-4 w-4" />
                </div>
              </h2>
              <div className="space-y-1">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      asChild
                    >
                      <Link href={item.href}>
                        <Icon className="mr-2 h-4 w-4" />
                        {item.title}
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
