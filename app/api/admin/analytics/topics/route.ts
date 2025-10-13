import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getPopularTopics } from "@/lib/services/analytics";

// GET /api/admin/analytics/topics - Get popular topics
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

    const popularTopics = await getPopularTopics();

    return NextResponse.json({
      success: true,
      data: popularTopics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch popular topics",
      },
      { status: 500 }
    );
  }
}
