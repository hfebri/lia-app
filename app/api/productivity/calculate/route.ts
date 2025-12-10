import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { calculateDailySnapshot } from "@/lib/db/queries/productivity";
import { db } from "@/db/db";
import { conversations } from "@/db/schema";
import { sql } from "drizzle-orm";

/**
 * POST /api/productivity/calculate
 *
 * Manually trigger productivity calculation for the authenticated user
 * This is useful for initial setup or testing
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedUser();

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate today's snapshot
    await calculateDailySnapshot(userId, today);

    // Also calculate for the past 7 days to populate the dashboard
    const calculations = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      try {
        await calculateDailySnapshot(userId, date);
        calculations.push({
          date: date.toISOString().split('T')[0],
          status: 'success'
        });
      } catch (error) {
        calculations.push({
          date: date.toISOString().split('T')[0],
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Productivity metrics calculated successfully",
      calculations,
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Productivity Calculate] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate productivity metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/productivity/calculate
 *
 * For admins: Calculate metrics for all users
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser();

    // Check if user is admin
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all users who have conversations
    const usersWithConversations = await db
      .selectDistinct({ userId: conversations.userId })
      .from(conversations);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = [];
    for (const { userId: targetUserId } of usersWithConversations) {
      try {
        await calculateDailySnapshot(targetUserId, today);
        results.push({
          userId: targetUserId,
          status: 'success'
        });
      } catch (error) {
        results.push({
          userId: targetUserId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Calculated metrics for ${results.length} users`,
      results,
    });
  } catch (error) {
    console.error("[Productivity Calculate All] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate productivity metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
