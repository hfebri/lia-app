import { createBrowserClient } from "@supabase/ssr";
import { AUTH_CONFIG } from "../auth/config";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      `Missing Supabase environment variables. URL: ${
        url ? "present" : "missing"
      }, Key: ${key ? "present" : "missing"}`
    );
  }

  return createBrowserClient(url, key, {
    auth: {
      // Use configured session options for consistent behavior
      detectSessionInUrl: AUTH_CONFIG.session.detectSessionInUrl,
      persistSession: AUTH_CONFIG.session.persistSession,
      autoRefreshToken: AUTH_CONFIG.session.autoRefreshToken,
      // IMPORTANT: PKCE is the secure flow for OAuth
      flowType: "pkce",
    },
    // Ensure cookies persist properly
    cookieOptions: {
      name: AUTH_CONFIG.cookies.name,
      domain: AUTH_CONFIG.cookies.domain, // undefined for current domain
      path: AUTH_CONFIG.cookies.path, // '/' for all paths
      sameSite: AUTH_CONFIG.cookies.sameSite, // 'lax' for OAuth
    },
  });
}
