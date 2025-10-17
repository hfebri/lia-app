import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST() {
  const cookieStore = await cookies();
  const cookiesToSet: Array<{
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[1];
  }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(newCookies) {
          cookiesToSet.push(...newCookies);
        },
      },
    }
  );

  const { error } = await supabase.auth.signOut();

  const response = NextResponse.json(
    error ? { success: false, message: error.message } : { success: true },
    {
      status: error ? 400 : 200,
    }
  );

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  });

  // Force-clear the known Supabase auth cookie as a fallback.
  response.cookies.set("supabase-auth-token", "", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    expires: new Date(0),
  });

  return response;
}
