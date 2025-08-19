import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_ROUTES, ADMIN_ROUTES } from "./lib/auth/config";

export async function middleware(request: NextRequest) {
  // TEMPORARY: Bypass all authentication for testing
  // Remove this return statement and uncomment the code below to re-enable authentication
  return NextResponse.next({
    request,
  });

  /*
  // Original middleware code - uncomment to re-enable authentication
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This will refresh session if expired - required for Server Components
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Check if it's a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  // Allow access to public routes and auth callback
  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/unauthorized" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".svg")
  ) {
    return supabaseResponse;
  }

  // If no session and trying to access protected route, redirect to sign in
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL("/auth/signin", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If trying to access admin routes, check user role
  if (session && isAdminRoute) {
    try {
      // Get user role from database
      const response = await fetch(`${request.nextUrl.origin}/api/auth/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: session.user.email }),
      });

      if (response.ok) {
        const user = await response.json();

        if (!user.isActive) {
          return NextResponse.redirect(
            new URL("/auth/signin?error=account_inactive", request.url)
          );
        }

        if (user.role !== "admin") {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      } else {
        // If we can't verify user, redirect to sign in
        return NextResponse.redirect(new URL("/auth/signin", request.url));
      }
    } catch (error) {
      console.error("Error checking user role in middleware:", error);
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
  }

  // If authenticated and trying to access sign-in page, redirect to dashboard
  if (session && pathname.startsWith("/auth/signin")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
  */
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
