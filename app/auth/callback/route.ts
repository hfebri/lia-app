import { createClient } from "../../../lib/supabase/server";
import { createOrUpdateUser } from "../../../lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = createClient();

    try {
      // Exchange the auth code for a session
      const {
        data: { session },
        error,
      } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Error exchanging code for session:", error);
        return NextResponse.redirect(
          `${origin}/auth/signin?error=callback_error`
        );
      }

      if (session?.user) {
        // Create or update user in our database
        const authUser = await createOrUpdateUser({
          email: session.user.email!,
          user_metadata: session.user.user_metadata,
        });

        if (!authUser) {
          console.error("Failed to create/update user in database");
          return NextResponse.redirect(
            `${origin}/auth/signin?error=database_error`
          );
        }

        if (!authUser.isActive) {
          console.log("User account is inactive:", authUser.email);
          return NextResponse.redirect(
            `${origin}/auth/signin?error=account_inactive`
          );
        }

        // Successful authentication - redirect to dashboard
        return NextResponse.redirect(`${origin}/dashboard`);
      }
    } catch (error) {
      console.error("Unexpected error in auth callback:", error);
      return NextResponse.redirect(
        `${origin}/auth/signin?error=unexpected_error`
      );
    }
  }

  // No code parameter or other error
  return NextResponse.redirect(`${origin}/auth/signin?error=missing_code`);
}
