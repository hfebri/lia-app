"use client";

import { useMemo, useCallback } from "react";
import { useAuthContext } from "../components/auth/auth-provider";
import { hasPermission, hasRole, isAdmin } from "../lib/auth/permissions";
import type { Permission } from "../lib/auth/permissions";
import type { UserRole } from "../db/types";

export function useAuth() {
  const context = useAuthContext();

  // Memoized permission checking functions
  const checkPermission = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(context.user, permission);
    },
    [context.user]
  );

  const checkRole = useCallback(
    (role: UserRole): boolean => {
      return hasRole(context.user, role);
    },
    [context.user]
  );

  const checkAdmin = useCallback((): boolean => {
    return isAdmin(context.user);
  }, [context.user]);

  // Memoized user info helpers
  const userInfo = useMemo(
    () => ({
      userId: context.user?.id,
      userEmail: context.user?.email,
      userName: context.user?.name,
      userRole: context.user?.role,
      userImage: context.user?.image,
    }),
    [context.user]
  );

  // Memoized convenience flags
  const convenienceFlags = useMemo(
    () => ({
      isAdmin: isAdmin(context.user),
      isUser: hasRole(context.user, "user"),
    }),
    [context.user]
  );

  return {
    // Auth state from context
    ...context,

    // User info
    ...userInfo,

    // Permission checking
    checkPermission,
    checkRole,
    checkAdmin,

    // Convenience flags
    ...convenienceFlags,
  };
}
