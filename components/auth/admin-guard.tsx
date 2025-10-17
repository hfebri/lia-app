"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/use-auth";
import { ProtectedRoute } from "./protected-route";
import type { Permission } from "../../lib/auth/permissions";

interface AdminGuardProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AdminGuard({
  children,
  requiredPermission,
  fallback,
  redirectTo = "/unauthorized",
}: AdminGuardProps) {
  return (
    <ProtectedRoute
      redirectTo={redirectTo}
      unauthenticatedRedirectTo="/signin"
    >
      <AdminCheck
        requiredPermission={requiredPermission}
        fallback={fallback}
        unauthorizedRedirectTo={redirectTo}
      >
        {children}
      </AdminCheck>
    </ProtectedRoute>
  );
}

interface AdminCheckProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
  unauthorizedRedirectTo?: string;
}

function AdminCheck({
  children,
  requiredPermission,
  fallback,
  unauthorizedRedirectTo,
}: AdminCheckProps) {
  const { user, checkPermission, checkAdmin, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if user has admin role
  const hasAdminRole = checkAdmin();

  // Check specific permission if provided
  const hasRequiredPermission = requiredPermission
    ? checkPermission(requiredPermission)
    : true;

  // User must be admin and have the required permission
  const isAuthorized = hasAdminRole && hasRequiredPermission;

  useEffect(() => {
    if (user && isAuthenticated && !isAuthorized && unauthorizedRedirectTo) {
      router.replace(unauthorizedRedirectTo);
    }
  }, [
    user,
    isAuthenticated,
    isAuthorized,
    unauthorizedRedirectTo,
    router,
  ]);

  // While auth state is resolving or user signed out, let ProtectedRoute handle redirects
  if (!user) {
    return null;
  }

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don&apos;t have permission to access this page. Administrator
            privileges are required.
          </p>
          <div className="text-sm text-muted-foreground">
            Current role: {user?.role || "none"}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
