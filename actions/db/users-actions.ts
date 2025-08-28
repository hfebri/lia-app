"use server";

import { db } from "@/db/db";
import { users } from "@/db/schema";
import type { User, NewUser } from "@/db/types";
import { ActionState } from "@/types";
import { eq, and, or, desc, count, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

export async function getUsersAction(): Promise<ActionState<User[]>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { isSuccess: false, message: "Unauthorized" };
    }

    if (currentUser.role !== "admin") {
      return { isSuccess: false, message: "Admin access required" };
    }

    const usersList = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });

    return {
      isSuccess: true,
      message: "Users retrieved successfully",
      data: usersList,
    };
  } catch (error) {
    console.error("Error getting users:", error);
    return { isSuccess: false, message: "Failed to get users" };
  }
}

export async function updateUserRoleAction(
  userId: string,
  newRole: "admin" | "user"
): Promise<ActionState<User>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { isSuccess: false, message: "Unauthorized" };
    }

    if (currentUser.role !== "admin") {
      return { isSuccess: false, message: "Admin access required" };
    }

    // Prevent self-role change if removing admin
    if (currentUser.id === userId && newRole !== "admin") {
      return {
        isSuccess: false,
        message: "Cannot remove admin role from yourself",
      };
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return { isSuccess: false, message: "User not found" };
    }

    return {
      isSuccess: true,
      message: `User role updated to ${newRole}`,
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { isSuccess: false, message: "Failed to update user role" };
  }
}

export async function deleteUserAction(
  userId: string
): Promise<ActionState<void>> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { isSuccess: false, message: "Unauthorized" };
    }

    if (currentUser.role !== "admin") {
      return { isSuccess: false, message: "Admin access required" };
    }

    // Prevent self-deletion
    if (currentUser.id === userId) {
      return {
        isSuccess: false,
        message: "Cannot delete your own account",
      };
    }

    // Check if user exists
    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userToDelete) {
      return { isSuccess: false, message: "User not found" };
    }

    // Delete the user (cascade should handle related data)
    await db.delete(users).where(eq(users.id, userId));

    return {
      isSuccess: true,
      message: "User deleted successfully",
      data: undefined,
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { isSuccess: false, message: "Failed to delete user" };
  }
}

export async function getUserStatsAction(): Promise<
  ActionState<{
    totalUsers: number;
    activeUsers: number;
    newRegistrations: number;
    adminUsers: number;
    totalConversations: number;
    totalMessages: number;
    totalFiles: number;
  }>
> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { isSuccess: false, message: "Unauthorized" };
    }

    if (currentUser.role !== "admin") {
      return { isSuccess: false, message: "Admin access required" };
    }

    // Get user statistics
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsersResult,
      activeUsersResult,
      newRegistrationsResult,
      adminUsersResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db
        .select({ count: count() })
        .from(users)
        .where(sql`last_active >= ${oneDayAgo}`),
      db
        .select({ count: count() })
        .from(users)
        .where(sql`created_at >= ${oneWeekAgo}`),
      db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "admin")),
    ]);

    // Get conversation and message counts
    const conversationStats = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT c.id) as conversation_count,
        COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.chat_id
    `);

    // Get file count
    const fileStats = await db.execute(sql`
      SELECT COUNT(*) as file_count
      FROM files
      WHERE is_active = true
    `);

    const stats = {
      totalUsers: totalUsersResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      newRegistrations: newRegistrationsResult[0]?.count || 0,
      adminUsers: adminUsersResult[0]?.count || 0,
      totalConversations: Number(conversationStats[0]?.conversation_count) || 0,
      totalMessages: Number(conversationStats[0]?.message_count) || 0,
      totalFiles: Number(fileStats[0]?.file_count) || 0,
    };

    return {
      isSuccess: true,
      message: "User stats retrieved successfully",
      data: stats,
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    return { isSuccess: false, message: "Failed to get user stats" };
  }
}
