import { createClient as createServerClient } from "../supabase/server";
import { db } from "../../db/db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import type { AuthUser } from "./types";
import type { User } from "../../db/types";

// Server-side authentication utilities
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient();

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return null;
    }

    // Get user data from our database
    const dbUser = await getUserFromDatabase(session.user.email!);

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    return dbUser;
  } catch (error) {
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  if (!user.isActive) {
    throw new Error("Account is inactive");
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

// Database utilities
export async function getUserFromDatabase(
  email: string
): Promise<AuthUser | null> {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const user = result[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      professionalRole: user.professionalRole,
      isActive: user.isActive,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    return null;
  }
}

export async function createOrUpdateUser(supabaseUser: {
  email: string;
  user_metadata?: {
    name?: string;
    picture?: string;
    avatar_url?: string;
  };
}): Promise<AuthUser | null> {
  try {
    // Check if user exists
    const existingUser = await getUserFromDatabase(supabaseUser.email);

    if (existingUser) {
      // Update existing user with latest info from OAuth
      const updates: Partial<User> = {};

      if (
        supabaseUser.user_metadata?.name &&
        supabaseUser.user_metadata.name !== existingUser.name
      ) {
        updates.name = supabaseUser.user_metadata.name;
      }

      const profileImage =
        supabaseUser.user_metadata?.picture ||
        supabaseUser.user_metadata?.avatar_url;
      if (profileImage && profileImage !== existingUser.image) {
        updates.image = profileImage;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();

        await db
          .update(users)
          .set(updates)
          .where(eq(users.email, supabaseUser.email));

        return { ...existingUser, ...updates };
      }

      return existingUser;
    } else {
      // Create new user
      const newUser = {
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || null,
        image:
          supabaseUser.user_metadata?.picture ||
          supabaseUser.user_metadata?.avatar_url ||
          null,
        role: "user" as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.insert(users).values(newUser).returning();

      if (!result[0]) {
        throw new Error("Failed to create user");
      }

      return {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        image: result[0].image,
        role: result[0].role,
        professionalRole: result[0].professionalRole,
        isActive: result[0].isActive,
        hasCompletedOnboarding: result[0].hasCompletedOnboarding,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt,
      };
    }
  } catch (error) {
    return null;
  }
}

// Utility functions
export function isAuthenticated(user: AuthUser | null): user is AuthUser {
  return user !== null && user.isActive;
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin" && user.isActive;
}

export function hasRole(
  user: AuthUser | null,
  role: "user" | "admin"
): boolean {
  return user?.role === role && user.isActive;
}

// Re-export types
export type {
  AuthUser,
  AuthSession,
  AuthContextType,
  SignInResult,
  AuthError,
} from "./types";
export {
  AUTH_CONFIG,
  AUTH_ROUTES,
  PROTECTED_ROUTES,
  ADMIN_ROUTES,
  handleAuthError,
} from "./config";
