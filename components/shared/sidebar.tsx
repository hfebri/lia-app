"use client";

import React, { memo, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-conversations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  Edit2,
  Trash2,
  User,
  LogOut,
  RefreshCw,
  Bug,
  Star,
  MoreVertical,
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
import { useNavigationLoader } from "@/components/providers/navigation-loader-provider";

interface SidebarProps {
  className?: string;
}

// Helper function to get friendly model names
const getModelDisplayName = (modelId: string): string => {
  if (modelId.includes("gpt-5-pro")) return "GPT-5 Pro";
  if (modelId.includes("gpt-5")) return "GPT-5";
  if (modelId.includes("gpt-4")) return "GPT-4";
  if (modelId.includes("gemini")) return "Gemini";
  if (modelId.includes("claude")) return "Claude";
  return modelId.split("/").pop()?.toUpperCase() || "AI";
};

// Helper function to get model color
const getModelColor = (modelId: string): string => {
  if (modelId.includes("gpt"))
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
  if (modelId.includes("claude"))
    return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
  if (modelId.includes("gemini"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
  return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
};

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
  matchPath?: string;
}

const navigationItems: NavItem[] = [
  {
    title: "New Chat",
    href: "/?newChat=1",
    icon: MessageSquare,
    matchPath: "/",
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
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Wait for client-side hydration to complete
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Destructure hooks with stable references
  const auth = useAuth();
  const conversations_hook = useConversations();
  const { startNavigation } = useNavigationLoader();

  // Extract specific values to track changes more precisely
  const { user, isAuthenticated, checkRole } = auth;
  const {
    conversations,
    createConversation,
    deleteConversation,
    toggleFavorite,
    isLoading,
  } = conversations_hook;

  // Memoize expensive computations with more granular dependencies
  const isAdmin = useMemo(() => user && checkRole("admin"), [user, checkRole]);
  const recentConversations = useMemo(
    () => {
      // Conversations are already sorted by the provider
      // Just take the first 10
      return conversations.slice(0, 10);
    },
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
  const currentSearch = searchParams.toString();
  const currentLocation = useMemo(
    () => (currentSearch ? `${pathname}?${currentSearch}` : pathname),
    [pathname, currentSearch]
  );

  const handleLinkNavigation = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, targetHref: string) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button !== 0
      ) {
        return;
      }

      if (targetHref === currentLocation) {
        return;
      }

      startNavigation();
    },
    [currentLocation, startNavigation]
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

  const handleToggleFavorite = useCallback(
    async (id: string, nextState: boolean) => {
      await toggleFavorite(id, nextState);
    },
    [toggleFavorite]
  );

  return (
    <div className={cn("h-full w-64 flex flex-col", className)}>
      {/* Sticky Logo and Theme Toggle */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={(event) => handleLinkNavigation(event, "/")}
            prefetch={false}
          >
            {mounted && (
              <Image
                src={
                  resolvedTheme === "dark"
                    ? "/logo-dark.svg"
                    : "/logo-light.svg"
                }
                alt="LIA Logo"
                width={32}
                height={32}
                className="h-8 w-auto rounded"
              />
            )}
            <h1 className="text-xl font-bold">LIA</h1>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </Link>
          <SimpleThemeToggle />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-4 py-4">
          {/* Navigation */}
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Navigation
            </h2>
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const matchPath = item.matchPath || item.href.split("?")[0];
                const isActive = pathname === matchPath;

                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    asChild
                  >
                    <Link
                      href={item.href}
                      onClick={(event) =>
                        handleLinkNavigation(event, item.href)
                      }
                      prefetch={false}
                    >
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

            <ScrollArea className="h-96">
              <div className="space-y-1">
                {isLoading ? (
                  <div className="space-y-2 px-4 py-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2 p-2">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No conversations yet
                    </p>
                  </div>
                ) : (
                  recentConversations.map((conversation) => {
                    const conversationHref = `/chat?conversation=${conversation.id}`;

                    return (
                      <div
                        key={conversation.id}
                        className="flex items-center gap-1 group pr-3"
                      >
                        <Button
                          variant="ghost"
                          className="flex-1 justify-start h-auto p-2 text-left min-w-0"
                          asChild
                        >
                          <Link
                            href={conversationHref}
                            onClick={(event) =>
                              handleLinkNavigation(event, conversationHref)
                            }
                            prefetch={false}
                            className="min-w-0"
                          >
                            <div className="flex items-start gap-2 w-full min-w-0">
                              <Clock className="h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-medium truncate flex-1 min-w-0">
                                    {conversation.title || "Untitled Chat"}
                                  </p>
                                  {conversation.isFavorite && (
                                    <Star
                                      className="h-3 w-3 text-amber-500 flex-shrink-0"
                                      fill="currentColor"
                                      strokeWidth={1.5}
                                      aria-label="Favorite conversation"
                                    />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(
                                      conversation.createdAt
                                    ).toLocaleDateString()}
                                  </p>
                                  {conversation.aiModel && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                                        getModelColor(conversation.aiModel)
                                      )}
                                    >
                                      {getModelDisplayName(
                                        conversation.aiModel
                                      )}
                                    </span>
                                  )}
                                </div>
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
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                handleToggleFavorite(
                                  conversation.id,
                                  !conversation.isFavorite
                                );
                              }}
                            >
                              <Star
                                className={cn(
                                  "h-3 w-3 mr-2",
                                  conversation.isFavorite
                                    ? "text-amber-500"
                                    : "text-muted-foreground"
                                )}
                                fill={
                                  conversation.isFavorite
                                    ? "currentColor"
                                    : "none"
                                }
                                strokeWidth={1.5}
                              />
                              <span className="text-xs">
                                {conversation.isFavorite
                                  ? "Remove Favorite"
                                  : "Add to Favorites"}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
                                    {conversation.title || "Untitled Chat"}
                                    &quot;? This action cannot be undone.
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
                    );
                  })
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
                        <Link
                          href={item.href}
                          onClick={(event) =>
                            handleLinkNavigation(event, item.href)
                          }
                          prefetch={false}
                        >
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
