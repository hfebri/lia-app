import { createClient as createServerClient } from "../supabase/server";
import { db } from "../../db/db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import type { AuthUser } from "./types";
import type { User } from "../../db/types";

// Server-side session management
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient();

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user?.email) {
      return null;
    }

    // Get user data from our database
    const dbUser = await getUserFromDatabase(session.user.email);

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    return dbUser;
  } catch (error) {
    return null;
  }
}

export async function getCurrentSession() {
  const supabase = await createServerClient();

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
}

export async function requireAuthenticatedUser(): Promise<{
  userId: string;
  user: AuthUser;
}> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return { userId: user.id, user };
}

// Database user operations
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
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    return null;
  }
}

// User profile management
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "image">>
): Promise<User | null> {
  try {
    const result = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0] || null;
  } catch (error) {
    return null;
  }
}

export async function updateUserRole(
  userId: string,
  role: "user" | "admin"
): Promise<User | null> {
  try {
    const result = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0] || null;
  } catch (error) {
    return null;
  }
}

export async function deactivateUser(userId: string): Promise<User | null> {
  try {
    const result = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0] || null;
  } catch (error) {
    return null;
  }
}

export async function reactivateUser(userId: string): Promise<User | null> {
  try {
    const result = await db
      .update(users)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0] || null;
  } catch (error) {
    return null;
  }
}

// Session validation
export async function validateUserSession(userId: string): Promise<boolean> {
  try {
    const user = await getUserById(userId);
    return user?.isActive || false;
  } catch (error) {
    return false;
  }
}

// User existence checks
export async function userExists(email: string): Promise<boolean> {
  try {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    return false;
  }
}

// Create or update user from Supabase auth
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
        const updatedUser = await updateUserProfile(existingUser.id, updates);
        if (updatedUser) {
          return {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            image: updatedUser.image,
            role: updatedUser.role,
            isActive: updatedUser.isActive,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
          };
        }
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
        isActive: result[0].isActive,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt,
      };
    }
  } catch (error) {
    return null;
  }
}
