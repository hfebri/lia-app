"use client";

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
    <ProtectedRoute redirectTo={redirectTo}>
      <AdminCheck requiredPermission={requiredPermission} fallback={fallback}>
        {children}
      </AdminCheck>
    </ProtectedRoute>
  );
}

interface AdminCheckProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
}

function AdminCheck({
  children,
  requiredPermission,
  fallback,
}: AdminCheckProps) {
  const { user, checkPermission, checkAdmin } = useAuth();

  // Check if user has admin role
  const hasAdminRole = checkAdmin();

  // Check specific permission if provided
  const hasRequiredPermission = requiredPermission
    ? checkPermission(requiredPermission)
    : true;

  // User must be admin and have the required permission
  const isAuthorized = hasAdminRole && hasRequiredPermission;

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this page. Administrator
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
