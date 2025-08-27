import { createServerClient } from "@supabase/ssr";
import { createOrUpdateUser } from "../../../lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  console.log("🔄 Auth callback received code:", code ? "present" : "missing");

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(`${origin}/`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    try {
      console.log("📱 Exchanging code for session...");
      // Exchange the auth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      console.log("📱 Exchange result:", { session: !!data.session, error });

      if (error) {
        console.error("❌ Error exchanging code for session:", error);
        return NextResponse.redirect(`${origin}/?error=callback_error`);
      }

      if (data.session?.user) {
        console.log("✅ Session received, creating/updating user for:", data.session.user.email);
        // Create or update user in our database
        const authUser = await createOrUpdateUser({
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        });

        if (!authUser) {
          console.error("❌ Failed to create/update user in database");
          return NextResponse.redirect(`${origin}/?error=database_error`);
        }

        if (!authUser.isActive) {
          console.log("⚠️ User account is inactive:", authUser.email);
          return NextResponse.redirect(`${origin}/?error=account_inactive`);
        }

        // Successful authentication - redirect to home page with cookies set
        console.log("🎉 Authentication successful, redirecting to home");
        return response;
      }
    } catch (error) {
      console.error("💥 Unexpected error in auth callback:", error);
      return NextResponse.redirect(`${origin}/?error=unexpected_error`);
    }
  }

  // No code parameter or other error
  console.error("❌ No code parameter in callback");
  return NextResponse.redirect(`${origin}/?error=missing_code`);
}
