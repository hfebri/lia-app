"use client";

import { useAuthContext } from "../components/auth/auth-provider";
import { hasPermission, hasRole, isAdmin } from "../lib/auth/permissions";
import type { Permission, UserRole } from "../lib/auth/permissions";

export function useAuth() {
  const context = useAuthContext();

  // Permission checking functions
  const checkPermission = (permission: Permission): boolean => {
    return hasPermission(context.user, permission);
  };

  const checkRole = (role: UserRole): boolean => {
    console.log("useAuth - User object:", context.user);
    console.log("useAuth - User role:", context.user?.role);
    console.log("useAuth - Checking role:", role);
    const result = hasRole(context.user, role);
    console.log("useAuth - Has role result:", result);
    return result;
  };

  const checkAdmin = (): boolean => {
    return isAdmin(context.user);
  };

  // User info helpers
  const userId = context.user?.id;
  const userEmail = context.user?.email;
  const userName = context.user?.name;
  const userRole = context.user?.role;
  const userImage = context.user?.image;

  return {
    // Auth state from context
    ...context,

    // User info
    userId,
    userEmail,
    userName,
    userRole,
    userImage,

    // Permission checking
    checkPermission,
    checkRole,
    checkAdmin,

    // Convenience flags
    isAdmin: checkAdmin(),
    isUser: checkRole("user"),
  };
}
