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

      // Exchange the auth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(`${origin}/?error=callback_error`);
      }

      if (data.session?.user) {

        // Create or update user in our database
        const authUser = await createOrUpdateUser({
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        });

        if (!authUser) {
          return NextResponse.redirect(`${origin}/?error=database_error`);
        }

        if (!authUser.isActive) {

          return NextResponse.redirect(`${origin}/?error=account_inactive`);
        }

        // Successful authentication - redirect to home page with cookies set

        return response;
      }
    } catch (error) {
      return NextResponse.redirect(`${origin}/?error=unexpected_error`);
    }
  }

  // No code parameter or other error
  return NextResponse.redirect(`${origin}/?error=missing_code`);
}
