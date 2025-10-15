import type { AuthError } from "@supabase/supabase-js";

// Get the base URL, forcing production URL for Netlify deploy previews
export const getBaseUrl = () => {
  // In browser, check if we're on a Netlify deploy preview or branch deploy
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const origin = window.location.origin;

    console.log('[AUTH-CONFIG] getBaseUrl called');
    console.log('[AUTH-CONFIG]   - Current hostname:', hostname);
    console.log('[AUTH-CONFIG]   - Current origin:', origin);
    console.log('[AUTH-CONFIG]   - Is Netlify?', hostname.includes('netlify.app'));
    console.log('[AUTH-CONFIG]   - Is production?', hostname === 'lia-app.netlify.app');

    // If it's a Netlify deploy that's NOT the production URL, force production URL
    // This handles:
    // - Deploy previews: 68ef11e1a1adaa00075bb599--lia-app.netlify.app
    // - Branch deploys: main--lia-app.netlify.app, develop--lia-app.netlify.app
    if (hostname.includes('netlify.app') && hostname !== 'lia-app.netlify.app') {
      console.log('[AUTH-CONFIG]   - ✅ Detected non-production Netlify URL, forcing production');
      console.log('[AUTH-CONFIG]   - Returning: https://lia-app.netlify.app');
      return 'https://lia-app.netlify.app';
    }

    console.log('[AUTH-CONFIG]   - Using current origin:', origin);
    return window.location.origin;
  }

  // On server, use env var or localhost
  const serverUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  console.log('[AUTH-CONFIG] getBaseUrl (server-side):', serverUrl);
  return serverUrl;
};

// Supabase Auth configuration
// Note: redirectTo should be computed dynamically in client components
export const AUTH_CONFIG = {
  // Provider-specific options
  google: {
    scopes: "email profile",
  },

  // Session options
  session: {
    // Auto-refresh tokens
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },

  // Cookie options
  cookies: {
    name: "supabase-auth-token",
    lifetime: 60 * 60 * 24 * 7, // 7 days
    domain: undefined,
    path: "/",
    sameSite: "lax" as const,
  },
} as const;

// Error handling utilities
export function handleAuthError(error: AuthError | null): string | null {
  if (!error) return null;

  switch (error.message) {
    case "Invalid login credentials":
      return "Invalid email or password. Please try again.";
    case "Email not confirmed":
      return "Please check your email and click the confirmation link.";
    case "Too many requests":
      return "Too many login attempts. Please try again later.";
    case "User already registered":
      return "An account with this email already exists.";
    default:
      return error.message || "An authentication error occurred.";
  }
}

// Route configuration
export const AUTH_ROUTES = {
  signIn: "/auth/signin",
  signUp: "/auth/signup",
  callback: "/auth/callback",
  dashboard: "/dashboard",
  admin: "/admin",
  unauthorized: "/unauthorized",
} as const;

// Protected route patterns
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/chat",
  "/templates",
  "/files",
  "/profile",
] as const;

// Admin-only route patterns
export const ADMIN_ROUTES = ["/admin"] as const;
