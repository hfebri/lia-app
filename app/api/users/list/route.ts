import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { assertAdmin } from "@/lib/auth/permissions";
import { getUsers } from "@/lib/db/queries/users";

// GET /api/users/list - Get list of users for admin filtering
export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();

    // Ensure only admins can access this endpoint
    assertAdmin(user);

    // Get all active users (limit to essentials for dropdown)
    const { users } = await getUsers({
      page: 1,
      limit: 1000, // Get all users for now; can add pagination later if needed
      sortBy: "name",
      sortOrder: "asc",
    });

    // Return only necessary fields for the dropdown
    const userList = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name || u.email,
    }));

    return NextResponse.json({
      success: true,
      data: userList,
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Handle authorization errors (non-admin users)
    if (error instanceof Error && error.name === "RoleError") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
