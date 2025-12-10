import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnalyticsData } from "@/lib/services/analytics";

// GET /api/admin/analytics - Get comprehensive analytics data
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const analyticsData = await getAnalyticsData(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch analytics",
      },
      { status: 500 }
    );
  }
}
