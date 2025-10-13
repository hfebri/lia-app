import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { users, conversations } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { isSuccess: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { isSuccess: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all users first
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get message counts for each user from conversations
    // Messages are now stored as JSONB array in conversations table
    const messageCounts = await db
      .select({
        userId: conversations.userId,
        count: sql<number>`SUM(jsonb_array_length(${conversations.messages}))`.as("messageCount"),
      })
      .from(conversations)
      .groupBy(conversations.userId);

    // Get conversation counts for each user
    const conversationCounts = await db
      .select({
        userId: conversations.userId,
        count: sql<number>`COUNT(${conversations.id})`.as("conversationCount"),
      })
      .from(conversations)
      .groupBy(conversations.userId);

    // Combine the data
    const usersWithCounts = allUsers.map((user) => {
      const conversationCount =
        conversationCounts.find((cc) => cc.userId === user.id)?.count || 0;
      const messageCount =
        messageCounts.find((mc) => mc.userId === user.id)?.count || 0;

      return {
        ...user,
        conversationCount: Number(conversationCount),
        messageCount: Number(messageCount),
      };
    });

    return NextResponse.json({
      isSuccess: true,
      message: "Users with counts retrieved successfully",
      data: usersWithCounts,
    });
  } catch (error) {
    console.error("[ADMIN USERS] Failed to get users with counts:", error);
    return NextResponse.json(
      {
        isSuccess: false,
        message: `Failed to get users with counts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
