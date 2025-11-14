import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUsageMetrics } from "@/lib/services/analytics";

// GET /api/admin/analytics/usage - Get usage metrics
export async function GET() {
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
