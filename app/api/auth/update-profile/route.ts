import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { db } from "@/db/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user: authUser } = await requireAuthenticatedUser();

    // Parse request body
    const body = await request.json();
    const { professionalRole, hasCompletedOnboarding } = body;

    // Validate input
    if (typeof professionalRole !== "string" || !professionalRole.trim()) {
      return NextResponse.json(
        { error: "Professional role is required" },
        { status: 400 }
      );
    }

    // Update user profile
    await db
      .update(users)
      .set({
        professionalRole: professionalRole.trim(),
        hasCompletedOnboarding:
          typeof hasCompletedOnboarding === "boolean"
            ? hasCompletedOnboarding
            : false,
        updatedAt: new Date(),
      })
      .where(eq(users.email, authUser.email));

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("[UPDATE-PROFILE] Error:", error);

    // Handle unauthenticated errors
    if (error.message === "Unauthorized" || error.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
