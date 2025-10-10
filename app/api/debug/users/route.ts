import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { users, conversations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    console.log("🔍 [DEBUG] Testing database connection");

    // First, let's get all users
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    console.log("✅ [DEBUG] Found users:", allUsers.length);

    // Get specific user data for Helmi
    const helmiUserId = "5e771bf0-1721-4216-9517-45fc90089720";
    const helmiUser = allUsers.find((u) => u.id === helmiUserId);

    if (helmiUser) {
      console.log("✅ [DEBUG] Found Helmi user:", helmiUser.email);

      // Get conversations for Helmi
      const helmiConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, helmiUserId));

      console.log("✅ [DEBUG] Helmi conversations:", helmiConversations.length);

      // Get messages for Helmi
      const helmiMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.userId, helmiUserId));

      console.log("✅ [DEBUG] Helmi messages:", helmiMessages.length);

      return NextResponse.json({
        success: true,
        totalUsers: allUsers.length,
        helmiUser: {
          id: helmiUser.id,
          email: helmiUser.email,
          name: helmiUser.name,
          conversationCount: helmiConversations.length,
          messageCount: helmiMessages.length,
          conversations: helmiConversations,
          messages: helmiMessages,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Helmi user not found",
        totalUsers: allUsers.length,
        allUserIds: allUsers.map((u) => ({ id: u.id, email: u.email })),
      });
    }
  } catch (error) {
    console.error("❌ [DEBUG] Database error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
