"use client";

import React, { memo, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  MoreHorizontal,
  Edit2,
  Trash2,
  User,
  LogOut,
  RefreshCw,
  Bug,
} from "lucide-react";
import { SimpleThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthButton } from "@/components/auth/auth-button";
import { LogoutButton } from "@/components/auth/logout-button";

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
    title: "Chat",
    href: "/",
    icon: MessageSquare,
  },
];

const adminItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    adminOnly: true,
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    adminOnly: true,
  },
];

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: SidebarProps, nextProps: SidebarProps) => {
  return prevProps.className === nextProps.className;
};

function SidebarComponent({ className }: SidebarProps) {
  // Memoize navigation hooks to prevent unnecessary updates
  const pathname = usePathname();
  const router = useRouter();

  // Destructure hooks with stable references
  const auth = useAuth();
  const conversations_hook = useConversations();

  // Extract specific values to track changes more precisely
  const { user, isAuthenticated, checkRole } = auth;
  const { conversations, createConversation, deleteConversation, isLoading } =
    conversations_hook;

  // Memoize expensive computations with more granular dependencies
  const isAdmin = useMemo(() => user && checkRole("admin"), [user, checkRole]);
  const recentConversations = useMemo(
    () => conversations.slice(0, 10),
    [conversations]
  );

  // Create stable callback references
  const stableCreateConversation = useCallback(
    (...args: Parameters<typeof createConversation>) =>
      createConversation(...args),
    [createConversation]
  );
  const stableDeleteConversation = useCallback(
    (...args: Parameters<typeof deleteConversation>) =>
      deleteConversation(...args),
    [deleteConversation]
  );
  const stableRouterPush = useCallback(
    (url: string) => router.push(url),
    [router]
  );

  // Delete conversation using the hook - memoized to prevent re-renders
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      const success = await stableDeleteConversation(id);
      if (!success) {
      }
      // The hook automatically updates the conversations list in state
    },
    [stableDeleteConversation]
  );

  return (
    <div className={cn("h-full w-64 flex flex-col", className)}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-4 py-4">
          {/* Logo and Theme Toggle */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between pl-3 mb-14">
              <Link href="/" className="flex items-center">
                <Bot className="h-6 w-6 mr-2" />
                <h1 className="text-xl font-bold">LIA App</h1>
              </Link>
              <div className="flex items-center gap-2">
                <SimpleThemeToggle />
              </div>
            </div>
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
            </div>

            <ScrollArea className="h-48">
              <div className="space-y-1">
                {conversations.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No conversations yet
                    </p>
                  </div>
                ) : (
                  recentConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-center gap-1 group"
                    >
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start h-auto p-2 text-left"
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

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                <span className="text-red-600 text-xs">
                                  Delete
                                </span>
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Conversation
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;
                                  {conversation.title || "Untitled Chat"}&quot;?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteConversation(conversation.id)
                                  }
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Admin Section */}
          {user && isAdmin && (
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

      {/* User Section - Sticky at bottom */}
      <div className="flex-shrink-0 px-3 py-4 border-t bg-background">
        {isAuthenticated && user ? (
          <>
            {/* User Profile & Actions */}
            <div className="space-y-2">
              {/* User Info */}
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image || ""} alt={user.name || ""} />
                  <AvatarFallback>
                    {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name || "User"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                    {isAdmin && (
                      <Badge variant="secondary" className="text-xs px-1">
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    window.open("https://forms.gle/rUNnrNkaTtvMAfYq9", "_blank")
                  }
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Report Bug
                </Button>
                <LogoutButton variant="ghost" size="sm" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </LogoutButton>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <AuthButton
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              loginText="Sign in"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Create a maximally stable sidebar component
const MemoizedSidebar = memo(SidebarComponent, arePropsEqual);

// Export with additional isolation
export const Sidebar = memo(function SidebarWrapper(props: SidebarProps) {
  return <MemoizedSidebar {...props} />;
});
