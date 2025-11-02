import { NextRequest, NextResponse } from "next/server";
import { getUserFromDatabase } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      console.error("[API-AUTH-USER] Email is required");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await getUserFromDatabase(email);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[API-AUTH-USER] Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
