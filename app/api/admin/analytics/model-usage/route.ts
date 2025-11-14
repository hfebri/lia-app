import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getUserModelUsageStats,
  getGlobalModelUsageStats,
} from "@/lib/services/analytics";

// GET /api/admin/analytics/model-usage - Get model usage statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Require authentication
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin =
      user.role === "admin" ||
      user.email?.includes("admin");

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const requestedUserId = searchParams.get("userId") || undefined;
    const modelId = searchParams.get("modelId") || undefined;

    // Admin can filter by any user, or see all users if no filter specified
    const userId = requestedUserId;

    // Fetch both user-level and global statistics
    const [userStats, globalStats] = await Promise.all([
      getUserModelUsageStats(startDate, endDate, userId, modelId),
      getGlobalModelUsageStats(startDate, endDate, modelId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        userStats,
        globalStats,
        filters: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          userId,
          modelId,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching model usage:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch model usage",
      },
      { status: 500 }
    );
  }
}
