import { createServerClient } from "@supabase/ssr";
import { createOrUpdateUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_CONFIG } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Redirect to the configured site URL (set per environment)
  // Falls back to request origin for local development if not configured
  const redirectOrigin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();

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
            cookiesToSet.push(...cookiesToSetParam);
          },
        },
        // IMPORTANT: Use the same cookie options as the browser client
        // This ensures PKCE verifier cookie is read with the correct name
        cookieOptions: {
          name: AUTH_CONFIG.cookies.name,
          domain: AUTH_CONFIG.cookies.domain,
          path: AUTH_CONFIG.cookies.path,
          sameSite: AUTH_CONFIG.cookies.sameSite,
        },
      }
    );

    try {
      // Exchange the auth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[AUTH-CALLBACK] Exchange failed:", error.message);
        const errorUrl = new URL("/signin", redirectOrigin);
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
        // Create or update user in our database
        const authUser = await createOrUpdateUser({
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        });

        if (!authUser) {
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
        } else {
          redirectPath = "/";
        }

        const successUrl = new URL(redirectPath, redirectOrigin);
        finalResponse = NextResponse.redirect(successUrl);

        // Set all cookies on the final response
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
