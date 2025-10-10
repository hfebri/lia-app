"use server";

import { db } from "@/db/db";
import { users, files, conversations } from "@/db/schema";
import type { User, NewUser } from "@/db/types";
import { ActionState } from "@/types";
import { eq, and, or, desc, count, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

export async function getUsersWithCountsAction(): Promise<
  ActionState<(User & { messageCount: number; fileCount: number })[]>
> {
  try {
    console.log(
      "🔍 [getUsersWithCountsAction] Starting users with counts retrieval"
    );

    const currentUser = await getCurrentUser();
    console.log(
      "🔍 [getUsersWithCountsAction] Current user:",
      currentUser?.id,
      currentUser?.role
    );

    if (!currentUser) {
      console.log("❌ [getUsersWithCountsAction] No current user found");
      return { isSuccess: false, message: "Unauthorized" };
    }

    if (currentUser.role !== "admin") {
      console.log(
        "❌ [getUsersWithCountsAction] User is not admin:",
        currentUser.role
      );
      return { isSuccess: false, message: "Admin access required" };
    }

    console.log("✅ [getUsersWithCountsAction] User authorization passed");

    // Get all users first
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get message counts for each user
    const messageCounts = await db
      .select({
        userId: messages.userId,
        count: sql<number>`COUNT(${messages.id})`.as("messageCount"),
      })
      .from(messages)
      .groupBy(messages.userId);

    // Get file counts for each user
    const fileCounts = await db
      .select({
        userId: files.userId,
        count: sql<number>`COUNT(${files.id})`.as("fileCount"),
      })
      .from(files)
      .where(eq(files.isActive, true))
      .groupBy(files.userId);

    // Combine the data
    const usersWithCounts = allUsers.map((user) => {
      const messageCount =
        messageCounts.find((mc) => mc.userId === user.id)?.count || 0;
      const fileCount =
        fileCounts.find((fc) => fc.userId === user.id)?.count || 0;

      return {
        ...user,
        messageCount: Number(messageCount),
        fileCount: Number(fileCount),
      };
    });

    return {
      isSuccess: true,
      message: "Users with counts retrieved successfully",
      data: usersWithCounts,
    };
  } catch (error) {
    console.error("❌ [getUsersWithCountsAction] Error occurred:", error);
    console.error("❌ [getUsersWithCountsAction] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return { isSuccess: false, message: "Failed to get users with counts" };
  }
}

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
    console.log("🔍 [getUserStatsAction] Starting user stats retrieval");

    const currentUser = await getCurrentUser();
    console.log(
      "🔍 [getUserStatsAction] Current user:",
      currentUser?.id,
      currentUser?.role
    );

    if (!currentUser) {
      console.log("❌ [getUserStatsAction] No current user found");
      return { isSuccess: false, message: "Unauthorized - Please sign in" };
    }

    if (currentUser.role !== "admin") {
      console.log(
        "❌ [getUserStatsAction] User is not admin:",
        currentUser.role
      );
      return { isSuccess: false, message: "Admin access required" };
    }

    console.log("✅ [getUserStatsAction] User authorization passed");

    // Get user statistics with simplified queries first
    console.log(
      "🔍 [getUserStatsAction] About to execute basic user count query"
    );

    let totalUsersResult;
    try {
      totalUsersResult = await db.select({ count: count() }).from(users);
      console.log(
        "✅ [getUserStatsAction] Total users query successful:",
        totalUsersResult[0]?.count
      );
    } catch (error) {
      console.error("❌ [getUserStatsAction] Total users query failed:", error);
      throw new Error(
        `Database query failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Get admin users count
    let adminUsersResult;
    try {
      adminUsersResult = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "admin"));
      console.log(
        "✅ [getUserStatsAction] Admin users query successful:",
        adminUsersResult[0]?.count
      );
    } catch (error) {
      console.error("❌ [getUserStatsAction] Admin users query failed:", error);
      adminUsersResult = [{ count: 0 }];
    }

    // For now, let's use simpler date calculations and provide fallback values
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let activeUsersResult = [{ count: 0 }];
    let newRegistrationsResult = [{ count: 0 }];

    try {
      activeUsersResult = await db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.updatedAt} >= ${oneDayAgo.toISOString()}`);
      console.log(
        "✅ [getUserStatsAction] Active users query successful:",
        activeUsersResult[0]?.count
      );
    } catch (error) {
      console.error(
        "❌ [getUserStatsAction] Active users query failed:",
        error
      );
    }

    try {
      newRegistrationsResult = await db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.createdAt} >= ${oneWeekAgo.toISOString()}`);
      console.log(
        "✅ [getUserStatsAction] New registrations query successful:",
        newRegistrationsResult[0]?.count
      );
    } catch (error) {
      console.error(
        "❌ [getUserStatsAction] New registrations query failed:",
        error
      );
    }

    // Get conversation, message, and file counts with fallbacks
    let conversationCountResult = [{ count: 0 }];
    let messageCountResult = [{ count: 0 }];
    let fileCountResult = [{ count: 0 }];

    try {
      conversationCountResult = await db
        .select({ count: count() })
        .from(conversations);
      console.log(
        "✅ [getUserStatsAction] Conversations query successful:",
        conversationCountResult[0]?.count
      );
    } catch (error) {
      console.error(
        "❌ [getUserStatsAction] Conversations query failed:",
        error
      );
    }

    try {
      messageCountResult = await db.select({ count: count() }).from(messages);
      console.log(
        "✅ [getUserStatsAction] Messages query successful:",
        messageCountResult[0]?.count
      );
    } catch (error) {
      console.error("❌ [getUserStatsAction] Messages query failed:", error);
    }

    try {
      fileCountResult = await db
        .select({ count: count() })
        .from(files)
        .where(eq(files.isActive, true));
      console.log(
        "✅ [getUserStatsAction] Files query successful:",
        fileCountResult[0]?.count
      );
    } catch (error) {
      console.error("❌ [getUserStatsAction] Files query failed:", error);
    }

    const stats = {
      totalUsers: Number(totalUsersResult[0]?.count) || 0,
      activeUsers: Number(activeUsersResult[0]?.count) || 0,
      newRegistrations: Number(newRegistrationsResult[0]?.count) || 0,
      adminUsers: Number(adminUsersResult[0]?.count) || 0,
      totalConversations: Number(conversationCountResult[0]?.count) || 0,
      totalMessages: Number(messageCountResult[0]?.count) || 0,
      totalFiles: Number(fileCountResult[0]?.count) || 0,
    };

    console.log("✅ [getUserStatsAction] Final stats compiled:", stats);

    return {
      isSuccess: true,
      message: "User stats retrieved successfully",
      data: stats,
    };
  } catch (error) {
    console.error("❌ [getUserStatsAction] Error occurred:", error);
    console.error("❌ [getUserStatsAction] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return {
      isSuccess: false,
      message: `Failed to get user stats: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
