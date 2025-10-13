import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { users, files, conversations } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Get all users first
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get message counts for each user from conversations JSONB
    const messageCounts = await db
      .select({
        userId: conversations.userId,
        count: sql<number>`SUM(jsonb_array_length(${conversations.messages}))`.as("messageCount"),
      })
      .from(conversations)
      .groupBy(conversations.userId);

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

    // Find Helmi specifically
    const helmiUser = usersWithCounts.find(
      (u) => u.id === "5e771bf0-1721-4216-9517-45fc90089720"
    );

    return NextResponse.json({
      success: true,
      totalUsers: usersWithCounts.length,
      helmiData: helmiUser
        ? {
            id: helmiUser.id,
            email: helmiUser.email,
            name: helmiUser.name,
            messageCount: helmiUser.messageCount,
            fileCount: helmiUser.fileCount,
          }
        : null,
      usersWithCounts: usersWithCounts.slice(0, 3), // First 3 for debugging
      messageCounts: messageCounts.slice(0, 5),
      fileCounts: fileCounts.slice(0, 5),
    });
  } catch (error) {
    console.error("❌ [DEBUG ADMIN TEST] Error:", error);
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
