import type { AuthUser } from "./types";
import type { UserRole } from "../../db/types";

// Permission definitions
export const PERMISSIONS = {
  // User permissions
  READ_OWN_PROFILE: "read:own_profile",
  UPDATE_OWN_PROFILE: "update:own_profile",
  CREATE_CONVERSATIONS: "create:conversations",
  READ_OWN_CONVERSATIONS: "read:own_conversations",
  UPDATE_OWN_CONVERSATIONS: "update:own_conversations",
  DELETE_OWN_CONVERSATIONS: "delete:own_conversations",
  CREATE_MESSAGES: "create:messages",
  READ_OWN_MESSAGES: "read:own_messages",
  UPLOAD_FILES: "upload:files",
  READ_OWN_FILES: "read:own_files",
  DELETE_OWN_FILES: "delete:own_files",
  USE_TEMPLATES: "use:templates",

  // Admin permissions
  READ_ALL_USERS: "read:all_users",
  UPDATE_ALL_USERS: "update:all_users",
  DELETE_USERS: "delete:users",
  MANAGE_USER_ROLES: "manage:user_roles",
  READ_ALL_CONVERSATIONS: "read:all_conversations",
  DELETE_ALL_CONVERSATIONS: "delete:all_conversations",
  CREATE_TEMPLATES: "create:templates",
  UPDATE_TEMPLATES: "update:templates",
  DELETE_TEMPLATES: "delete:templates",
  READ_ANALYTICS: "read:analytics",
  MANAGE_SYSTEM: "manage:system",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role-based permissions mapping
const USER_PERMISSIONS: Permission[] = [
  PERMISSIONS.READ_OWN_PROFILE,
  PERMISSIONS.UPDATE_OWN_PROFILE,
  PERMISSIONS.CREATE_CONVERSATIONS,
  PERMISSIONS.READ_OWN_CONVERSATIONS,
  PERMISSIONS.UPDATE_OWN_CONVERSATIONS,
  PERMISSIONS.DELETE_OWN_CONVERSATIONS,
  PERMISSIONS.CREATE_MESSAGES,
  PERMISSIONS.READ_OWN_MESSAGES,
  PERMISSIONS.UPLOAD_FILES,
  PERMISSIONS.READ_OWN_FILES,
  PERMISSIONS.DELETE_OWN_FILES,
  PERMISSIONS.USE_TEMPLATES,
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...USER_PERMISSIONS,
  PERMISSIONS.READ_ALL_USERS,
  PERMISSIONS.UPDATE_ALL_USERS,
  PERMISSIONS.DELETE_USERS,
  PERMISSIONS.MANAGE_USER_ROLES,
  PERMISSIONS.READ_ALL_CONVERSATIONS,
  PERMISSIONS.DELETE_ALL_CONVERSATIONS,
  PERMISSIONS.CREATE_TEMPLATES,
  PERMISSIONS.UPDATE_TEMPLATES,
  PERMISSIONS.DELETE_TEMPLATES,
  PERMISSIONS.READ_ANALYTICS,
  PERMISSIONS.MANAGE_SYSTEM,
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: USER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
};

// Permission checking functions
export function hasPermission(
  user: AuthUser | null,
  permission: Permission
): boolean {
  if (!user || !user.isActive) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role];
  return rolePermissions.includes(permission);
}

export function hasAnyPermission(
  user: AuthUser | null,
  permissions: Permission[]
): boolean {
  if (!user || !user.isActive) {
    return false;
  }

  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(
  user: AuthUser | null,
  permissions: Permission[]
): boolean {
  if (!user || !user.isActive) {
    return false;
  }

  return permissions.every((permission) => hasPermission(user, permission));
}

// Role checking functions
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin" && user.isActive;
}

export function isUser(user: AuthUser | null): boolean {
  return user?.role === "user" && user.isActive;
}

export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  return user?.role === role && user.isActive;
}

// Resource ownership checking
export function canAccessOwnResource(
  user: AuthUser | null,
  resourceUserId: string
): boolean {
  return user?.id === resourceUserId && user.isActive;
}

export function canAccessResource(
  user: AuthUser | null,
  resourceUserId: string,
  adminPermission: Permission
): boolean {
  if (!user || !user.isActive) {
    return false;
  }

  // Can access own resource
  if (user.id === resourceUserId) {
    return true;
  }

  // Admin can access if they have the required permission
  return hasPermission(user, adminPermission);
}

// Utility functions for common checks
export function canManageUsers(user: AuthUser | null): boolean {
  return hasPermission(user, PERMISSIONS.MANAGE_USER_ROLES);
}

export function canViewAnalytics(user: AuthUser | null): boolean {
  return hasPermission(user, PERMISSIONS.READ_ANALYTICS);
}

export function canManageTemplates(user: AuthUser | null): boolean {
  return hasPermission(user, PERMISSIONS.CREATE_TEMPLATES);
}

export function canAccessAdminPanel(user: AuthUser | null): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.READ_ALL_USERS,
    PERMISSIONS.READ_ANALYTICS,
    PERMISSIONS.MANAGE_SYSTEM,
  ]);
}

// Error types for permission violations
export class PermissionError extends Error {
  constructor(message: string, public permission: Permission) {
    super(message);
    this.name = "PermissionError";
  }
}

export class RoleError extends Error {
  constructor(message: string, public requiredRole: UserRole) {
    super(message);
    this.name = "RoleError";
  }
}

// Permission assertion functions (throw errors if not authorized)
export function assertPermission(
  user: AuthUser | null,
  permission: Permission
): void {
  if (!hasPermission(user, permission)) {
    throw new PermissionError(`Missing permission: ${permission}`, permission);
  }
}

export function assertRole(user: AuthUser | null, role: UserRole): void {
  if (!hasRole(user, role)) {
    throw new RoleError(`Required role: ${role}`, role);
  }
}

export function assertAdmin(user: AuthUser | null): void {
  assertRole(user, "admin");
}
