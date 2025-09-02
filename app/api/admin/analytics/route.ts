import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getAnalyticsData } from "@/lib/services/analytics";

// GET /api/admin/analytics - Get comprehensive analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    // Check if user is admin
    const isAdmin =
      session?.user?.role === "admin" ||
      session?.user?.email?.includes("admin");

    // For demo purposes, allow access if no session (development mode)
    if (session && !isAdmin) {
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
