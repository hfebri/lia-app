import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { ActiveUsersService } from "@/lib/services/active-users-service";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser();

    // 2. Get session ID from cookie or generate new one
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("lia_session_id")?.value;
    let isNewSession = false;

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      isNewSession = true;
    }

    // 3. Get client info
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;

    // 4. Update session in DB
    await ActiveUsersService.updateUserSession(
      userId,
      sessionId,
      userAgent,
      ipAddress
    );

    // 5. Return response (setting cookie if new)
    const response = new NextResponse(null, { status: 204 });
    
    if (isNewSession) {
      // Set cookie for 30 days
      response.cookies.set("lia_session_id", sessionId, {
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Heartbeat API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
