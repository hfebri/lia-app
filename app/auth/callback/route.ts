import { createServerClient } from "@supabase/ssr";
import { createOrUpdateUser } from "../../../lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

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
      console.log("[AUTH-CALLBACK] Starting code exchange");

      // Exchange the auth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[AUTH-CALLBACK] Exchange failed:", error.message);
        return NextResponse.redirect(`${origin}/?error=callback_error`);
      }

      if (data.session?.user) {
        console.log("[AUTH-CALLBACK] Session obtained for:", data.session.user.email);
        console.log("[AUTH-CALLBACK] Session ID:", data.session.access_token.substring(0, 20) + "...");

        // Create or update user in our database
        const authUser = await createOrUpdateUser({
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        });

        if (!authUser) {
          console.error("[AUTH-CALLBACK] Failed to create/update user in database");
          return NextResponse.redirect(`${origin}/?error=database_error`);
        }

        console.log("[AUTH-CALLBACK] User created/updated:", authUser.email, "Active:", authUser.isActive);

        if (!authUser.isActive) {
          console.warn("[AUTH-CALLBACK] Account inactive:", authUser.email);
          return NextResponse.redirect(`${origin}/?error=account_inactive`);
        }

        // Successful authentication - redirect to home page with cookies set
        console.log("[AUTH-CALLBACK] Success! Redirecting to home with new session");
        return response;
      }

      console.error("[AUTH-CALLBACK] No session or user in exchange response");
      return NextResponse.redirect(`${origin}/?error=no_session`);
    } catch (error) {
      console.error("[AUTH-CALLBACK] Unexpected error:", error);
      return NextResponse.redirect(`${origin}/?error=unexpected_error`);
    }
  }

  // No code parameter or other error
  return NextResponse.redirect(`${origin}/?error=missing_code`);
}
