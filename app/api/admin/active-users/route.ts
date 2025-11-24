import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ActiveUsersService } from "@/lib/services/active-users-service";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can view active user metrics
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const metrics = await ActiveUsersService.getActiveUserMetrics();
    const trends = await ActiveUsersService.getTrends(metrics);

    return NextResponse.json({
      ...metrics,
      trends,
    });
  } catch (error) {
    console.error("[Active Users API] Failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
