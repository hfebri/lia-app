import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: "No user authenticated",
        userAuthenticated: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: "User authenticated",
      userAuthenticated: true,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        isActive: currentUser.isActive,
      },
      isAdmin: currentUser.role === "admin",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Error checking authentication",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
