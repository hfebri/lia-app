import type { AuthError } from "@supabase/supabase-js";

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
    lifetime: 60 * 60 * 24 * 30, // 30 days (extended from 7 days to reduce logout frequency)
    domain: undefined,
    path: "/",
    sameSite: "lax" as const,
  },

  // Token refresh settings
  tokenRefresh: {
    // Refresh more aggressively - 15 minutes before expiry instead of 5
    earlyRefreshThreshold: 15 * 60 * 1000, // 15 minutes
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
