import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { users, messages, conversations } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [ADMIN USERS] Admin users API called");
    const currentUser = await getCurrentUser();
    console.log(
      "🔍 [ADMIN USERS] Current user:",
      currentUser?.email,
      currentUser?.role
    );

    if (!currentUser) {
      console.log("❌ [ADMIN USERS] No current user");
      return NextResponse.json(
        { isSuccess: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "admin") {
      console.log("❌ [ADMIN USERS] User is not admin:", currentUser.role);
      return NextResponse.json(
        { isSuccess: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    console.log("✅ [ADMIN USERS] User authorization passed");

    // Get all users first
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get message counts for each user
    console.log("🔍 [ADMIN USERS] Fetching message counts...");
    const messageCounts = await db
      .select({
        userId: messages.userId,
        count: sql<number>`COUNT(${messages.id})`.as("messageCount"),
      })
      .from(messages)
      .groupBy(messages.userId);
    console.log("✅ [ADMIN USERS] Message counts found:", messageCounts.length);

    // Get conversation counts for each user
    console.log("🔍 [ADMIN USERS] Fetching conversation counts...");
    const conversationCounts = await db
      .select({
        userId: conversations.userId,
        count: sql<number>`COUNT(${conversations.id})`.as("conversationCount"),
      })
      .from(conversations)
      .groupBy(conversations.userId);
    console.log(
      "✅ [ADMIN USERS] Conversation counts found:",
      conversationCounts.length
    );

    // Combine the data
    console.log(
      "🔍 [ADMIN USERS] Combining data for",
      allUsers.length,
      "users"
    );
    const usersWithCounts = allUsers.map((user) => {
      const conversationCount =
        conversationCounts.find((cc) => cc.userId === user.id)?.count || 0;
      const messageCount =
        messageCounts.find((mc) => mc.userId === user.id)?.count || 0;

      if (user.email === "hfebri@leverategroup.asia") {
        console.log("🔍 [ADMIN USERS] Helmi data:", {
          userId: user.id,
          conversationCount,
          messageCount,
          conversationCountNum: Number(conversationCount),
          messageCountNum: Number(messageCount),
        });
      }

      return {
        ...user,
        conversationCount: Number(conversationCount),
        messageCount: Number(messageCount),
      };
    });

    console.log(
      "✅ [ADMIN USERS] Final combined data count:",
      usersWithCounts.length
    );

    return NextResponse.json({
      isSuccess: true,
      message: "Users with counts retrieved successfully",
      data: usersWithCounts,
    });
  } catch (error) {
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
