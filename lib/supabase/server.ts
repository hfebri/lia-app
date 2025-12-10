import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_CONFIG } from "../auth/config";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      // IMPORTANT: Use the same cookie options as the browser client
      // This ensures session cookies are read with the correct name
      cookieOptions: {
        name: AUTH_CONFIG.cookies.name,
        domain: AUTH_CONFIG.cookies.domain,
        path: AUTH_CONFIG.cookies.path,
        sameSite: AUTH_CONFIG.cookies.sameSite,
      },
    }
  );
}

// Alternative method for route handlers
export function createRouteHandlerClient(request: Request, response: Response) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.headers.get('cookie');
          return cookies?.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=');
            return { name, value };
          }) || [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.headers.set('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; ${options?.secure ? 'Secure;' : ''} SameSite=Lax`);
          });
        },
      },
    }
  );
}
