import { createServerClient } from "@supabase/ssr";
import { createOrUpdateUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Determine the correct redirect origin
  // Priority: production domain > current origin (but allow localhost for development)
  const productionDomain = "https://lia.leverategroup.asia";
  const isNetlifyPreview = requestUrl.hostname.includes(
    "--lia-app.netlify.app"
  );
  const redirectOrigin = isNetlifyPreview
    ? productionDomain
    : requestUrl.origin;

  // Always redirect to home - let the client handle further routing
  const redirectUrl = new URL("/", redirectOrigin);

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(redirectUrl);

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
              response.cookies.set(name, value, {
                ...options,
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              })
            );
          },
        },
      }
    );

    try {
      // Exchange the auth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[AUTH-CALLBACK] Exchange failed:", error.message);
        redirectUrl.searchParams.set("error", "callback_error");
        return NextResponse.redirect(redirectUrl);
      }

      if (data.session?.user) {
        // Create or update user in our database
        const authUser = await createOrUpdateUser({
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        });

        if (!authUser) {
          console.error(
            "[AUTH-CALLBACK] Failed to create/update user in database"
          );
          redirectUrl.searchParams.set("error", "database_error");
          return NextResponse.redirect(redirectUrl);
        }

        if (!authUser.isActive) {
          console.warn("[AUTH-CALLBACK] Account inactive:", authUser.email);
          redirectUrl.searchParams.set("error", "account_inactive");
          return NextResponse.redirect(redirectUrl);
        }

        return response;
      }

      console.error("[AUTH-CALLBACK] No session or user in exchange response");
      redirectUrl.searchParams.set("error", "no_session");
      return NextResponse.redirect(redirectUrl);
    } catch (error) {
      console.error("[AUTH-CALLBACK] Unexpected error:", error);
      redirectUrl.searchParams.set("error", "unexpected_error");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // No code parameter or other error
  console.error("[AUTH-CALLBACK] No code parameter");
  redirectUrl.searchParams.set("error", "missing_code");
  return NextResponse.redirect(redirectUrl);
}
