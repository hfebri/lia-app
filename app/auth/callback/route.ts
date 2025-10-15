import { createServerClient } from "@supabase/ssr";
import { createOrUpdateUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  console.log("[AUTH-CALLBACK] ========================================");
  console.log("[AUTH-CALLBACK] Full callback URL:", requestUrl.toString());
  console.log("[AUTH-CALLBACK] Origin:", requestUrl.origin);
  console.log("[AUTH-CALLBACK] Hostname:", requestUrl.hostname);
  console.log("[AUTH-CALLBACK] Code:", code ? "present" : "missing");
  console.log("[AUTH-CALLBACK] Referer:", request.headers.get("referer"));
  console.log("[AUTH-CALLBACK] Host header:", request.headers.get("host"));
  console.log("[AUTH-CALLBACK] X-Forwarded-Host:", request.headers.get("x-forwarded-host"));
  console.log("[AUTH-CALLBACK] X-Forwarded-Proto:", request.headers.get("x-forwarded-proto"));
  console.log("[AUTH-CALLBACK] All headers:", JSON.stringify(Object.fromEntries(request.headers.entries())));
  console.log("[AUTH-CALLBACK] ========================================");

  // Determine the correct redirect origin
  // Priority: production domain > current origin
  const productionDomain = "https://lia.leverategroup.asia";
  const isNetlifyPreview = requestUrl.hostname.includes("--lia-app.netlify.app");
  const redirectOrigin = isNetlifyPreview ? productionDomain : requestUrl.origin;

  console.log("[AUTH-CALLBACK] Is Netlify preview/branch deploy:", isNetlifyPreview);
  console.log("[AUTH-CALLBACK] Redirect origin:", redirectOrigin);

  // Always redirect to home - let the client handle further routing
  const redirectUrl = new URL("/", redirectOrigin);

  console.log("[AUTH-CALLBACK] Will redirect to:", redirectUrl.toString());

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
      console.log("[AUTH-CALLBACK] Starting code exchange");

      // Exchange the auth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[AUTH-CALLBACK] Exchange failed:", error.message);
        redirectUrl.searchParams.set("error", "callback_error");
        return NextResponse.redirect(redirectUrl);
      }

      if (data.session?.user) {
        console.log("[AUTH-CALLBACK] Session obtained for:", data.session.user.email);

        // Create or update user in our database
        const authUser = await createOrUpdateUser({
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        });

        if (!authUser) {
          console.error("[AUTH-CALLBACK] Failed to create/update user in database");
          redirectUrl.searchParams.set("error", "database_error");
          return NextResponse.redirect(redirectUrl);
        }

        console.log("[AUTH-CALLBACK] User created/updated:", authUser.email, "Active:", authUser.isActive);

        if (!authUser.isActive) {
          console.warn("[AUTH-CALLBACK] Account inactive:", authUser.email);
          redirectUrl.searchParams.set("error", "account_inactive");
          return NextResponse.redirect(redirectUrl);
        }

        // Successful authentication - redirect to home
        console.log("[AUTH-CALLBACK] ✅ Success! Redirecting to home");
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
