import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getUsageMetrics } from "@/lib/services/analytics";

// GET /api/admin/analytics/usage - Get usage metrics
export async function GET() {
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

    const usageMetrics = await getUsageMetrics();

    return NextResponse.json({
      success: true,
      data: usageMetrics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch usage metrics",
      },
      { status: 500 }
    );
  }
}
