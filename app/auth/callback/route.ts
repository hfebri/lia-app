import { createServerClient } from "@supabase/ssr";
import { createOrUpdateUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  console.log("[AUTH-CALLBACK] 🚀 Starting OAuth callback");
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  console.log("[AUTH-CALLBACK] 📍 Request URL:", requestUrl.href);
  console.log("[AUTH-CALLBACK] 🔑 Auth code present:", !!code);

  // Determine the correct redirect origin
  // Priority: production domain > current origin (but allow localhost for development)
  const productionDomain = "https://lia.leverategroup.asia";
  const isNetlifyPreview = requestUrl.hostname.includes(
    "--lia-app.netlify.app"
  );
  const redirectOrigin = isNetlifyPreview
    ? productionDomain
    : requestUrl.origin;
  console.log("[AUTH-CALLBACK] 🌐 Redirect origin:", redirectOrigin);
  console.log("[AUTH-CALLBACK] 🔍 Is Netlify preview:", isNetlifyPreview);

  if (code) {
    const cookieStore = await cookies();
    console.log("[AUTH-CALLBACK] 🍪 Cookie store initialized");

    // We'll create the response AFTER checking onboarding status
    let finalResponse: NextResponse;
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSetParam) {
            // Store cookies to set them later on the final response
            console.log("[AUTH-CALLBACK] 🍪 Storing", cookiesToSetParam.length, "cookies for later");
            cookiesToSet.push(...cookiesToSetParam);
          },
        },
      }
    );

    try {
      console.log("[AUTH-CALLBACK] 🔄 Exchanging auth code for session...");
      // Exchange the auth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[AUTH-CALLBACK] Exchange failed:", error.message);
        const errorUrl = new URL("/", redirectOrigin);
        errorUrl.searchParams.set("error", "callback_error");
        finalResponse = NextResponse.redirect(errorUrl);

        // Set cookies on error response
        cookiesToSet.forEach(({ name, value, options }) => {
          finalResponse.cookies.set(name, value, {
            ...options,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        });

        return finalResponse;
      }

      if (data.session?.user) {
        console.log("[AUTH-CALLBACK] ✅ Session obtained for:", data.session.user.email);

        // Create or update user in our database
        console.log("[AUTH-CALLBACK] 💾 Creating/updating user in database...");
        const authUser = await createOrUpdateUser({
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        });

        if (!authUser) {
          console.error(
            "[AUTH-CALLBACK] ❌ Failed to create/update user in database"
          );
          const errorUrl = new URL("/", redirectOrigin);
          errorUrl.searchParams.set("error", "database_error");
          finalResponse = NextResponse.redirect(errorUrl);

          // Set cookies on error response
          cookiesToSet.forEach(({ name, value, options }) => {
            finalResponse.cookies.set(name, value, {
              ...options,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          });

          return finalResponse;
        }

        console.log("[AUTH-CALLBACK] ✅ User record obtained:", {
          email: authUser.email,
          hasCompletedOnboarding: authUser.hasCompletedOnboarding,
          isActive: authUser.isActive,
        });

        if (!authUser.isActive) {
          console.warn("[AUTH-CALLBACK] ⚠️ Account inactive:", authUser.email);
          const errorUrl = new URL("/", redirectOrigin);
          errorUrl.searchParams.set("error", "account_inactive");
          finalResponse = NextResponse.redirect(errorUrl);

          // Set cookies on error response
          cookiesToSet.forEach(({ name, value, options }) => {
            finalResponse.cookies.set(name, value, {
              ...options,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          });

          return finalResponse;
        }

        // Determine final redirect based on onboarding status
        let redirectPath = "/";
        if (!authUser.hasCompletedOnboarding) {
          redirectPath = "/onboarding";
          console.log("[AUTH-CALLBACK] 🆕 New user - redirecting to /onboarding");
        } else {
          redirectPath = "/";
          console.log("[AUTH-CALLBACK] 👤 Existing user - redirecting to /");
        }

        const successUrl = new URL(redirectPath, redirectOrigin);
        console.log("[AUTH-CALLBACK] 🎯 Final redirect URL:", successUrl.href);
        finalResponse = NextResponse.redirect(successUrl);

        // Set all cookies on the final response
        console.log("[AUTH-CALLBACK] 🍪 Setting", cookiesToSet.length, "cookies on final response");
        cookiesToSet.forEach(({ name, value, options }) => {
          console.log("[AUTH-CALLBACK] 🍪 Setting cookie:", name);
          finalResponse.cookies.set(name, value, {
            ...options,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        });

        console.log("[AUTH-CALLBACK] ✅ Redirecting to:", redirectPath);
        return finalResponse;
      }

      console.error("[AUTH-CALLBACK] No session or user in exchange response");
      const errorUrl = new URL("/", redirectOrigin);
      errorUrl.searchParams.set("error", "no_session");
      finalResponse = NextResponse.redirect(errorUrl);

      // Set cookies on error response
      cookiesToSet.forEach(({ name, value, options }) => {
        finalResponse.cookies.set(name, value, {
          ...options,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      });

      return finalResponse;
    } catch (error) {
      console.error("[AUTH-CALLBACK] Unexpected error:", error);
      const errorUrl = new URL("/", redirectOrigin);
      errorUrl.searchParams.set("error", "unexpected_error");
      finalResponse = NextResponse.redirect(errorUrl);

      // Set cookies on error response
      cookiesToSet.forEach(({ name, value, options }) => {
        finalResponse.cookies.set(name, value, {
          ...options,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      });

      return finalResponse;
    }
  }

  // No code parameter or other error
  console.error("[AUTH-CALLBACK] No code parameter");
  const errorUrl = new URL("/", redirectOrigin);
  errorUrl.searchParams.set("error", "missing_code");
  return NextResponse.redirect(errorUrl);
}
