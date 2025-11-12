import { createClient } from "../supabase/client";

/**
 * Auth-aware fetch wrapper that automatically handles 401 errors
 * and attempts to refresh the session before retrying.
 *
 * IMPORTANT: Only handles expired token errors, not authorization errors.
 * If the user lacks permission (legitimate 401/403), the error is returned to caller.
 *
 * Usage:
 * const response = await authFetch('/api/user/analytics');
 * const data = await response.json();
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // First attempt
  let response = await fetch(url, options);

  // If we get a 401, check if it's an expired token before refreshing
  if (response.status === 401) {
    console.log("[AUTH-FETCH] 🔄 Received 401, checking if token is expired...");

    try {
      const supabase = createClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      // Determine if we should attempt a refresh:
      // 1. No session at all → definitely expired
      // 2. Session exists but expires_at is in the past → expired
      // 3. Session exists and not expired → legitimate 401 (authorization error)

      let shouldRefresh = false;

      if (sessionError || !session) {
        // No session or error getting session → try refresh
        console.log("[AUTH-FETCH] 🔄 No valid session, will attempt refresh");
        shouldRefresh = true;
      } else {
        // Session exists - check if token is expired
        const expiresAt = session.expires_at; // Unix timestamp in seconds
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000); // Current time in seconds
          const isExpired = now >= expiresAt;

          if (isExpired) {
            console.log("[AUTH-FETCH] 🔄 Token is expired (expires_at in past), will attempt refresh");
            shouldRefresh = true;
          } else {
            console.log(
              "[AUTH-FETCH] ℹ️ Token not expired (valid until " +
              new Date(expiresAt * 1000).toISOString() +
              ") - 401 is a legitimate authorization error"
            );
            shouldRefresh = false;
          }
        } else {
          // No expires_at field - this shouldn't happen, but try refresh to be safe
          console.log("[AUTH-FETCH] ⚠️ No expires_at in session, will attempt refresh");
          shouldRefresh = true;
        }
      }

      if (shouldRefresh) {
        console.log("[AUTH-FETCH] 🔄 Attempting session refresh...");

        // Supabase's refreshSession will update cookies automatically
        // The onAuthStateChange listener in AuthProvider will update React state
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
          console.error(
            "[AUTH-FETCH] ❌ Session refresh failed:",
            refreshError?.message
          );

          // Only redirect if refresh failed due to expired/invalid refresh token
          if (refreshError?.message?.includes("refresh_token")) {
            if (typeof window !== "undefined") {
              console.warn("[AUTH-FETCH] ⚠️ Refresh token expired - redirecting to sign-in...");
              window.location.href = "/signin?error=session_expired";
            }
          }

          return response; // Return original 401 response
        }

        console.log("[AUTH-FETCH] ✅ Session refreshed, retrying request...");

        // NOTE: Supabase's refreshSession updates the session in cookies/storage.
        // The AuthProvider's onAuthStateChange listener will pick up this change
        // and update the React state automatically. No manual sync needed.

        // Retry the original request with refreshed session
        response = await fetch(url, options);

        if (response.ok) {
          console.log("[AUTH-FETCH] ✅ Retry successful");
        } else {
          console.warn(
            "[AUTH-FETCH] ⚠️ Retry failed with status:",
            response.status
          );
        }
      }
      // If !shouldRefresh, we fall through and return original 401
    } catch (error) {
      console.error("[AUTH-FETCH] ❌ Error during session check/refresh:", error);
      // Don't redirect on errors - return original response to caller
    }
  }

  return response;
}

/**
 * Auth-aware fetch wrapper for JSON responses
 * Automatically parses JSON and handles errors
 *
 * Usage:
 * const data = await authFetchJSON('/api/user/analytics');
 */
export async function authFetchJSON<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await authFetch(url, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    let errorData;

    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }

    throw new Error(
      errorData.message || errorData.error || `Request failed: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Check if session is close to expiry
 * Returns true if token expires within the next 5 minutes
 */
export async function isSessionNearExpiry(): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.expires_at) return false;

    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const FIVE_MINUTES = 5 * 60 * 1000;

    return timeUntilExpiry < FIVE_MINUTES;
  } catch {
    return false;
  }
}

/**
 * Proactively refresh session if needed
 * Call this before critical operations
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    const supabase = createClient();

    // Check if session is near expiry
    const nearExpiry = await isSessionNearExpiry();

    if (nearExpiry) {
      console.log(
        "[AUTH-FETCH] ⏰ Session near expiry, refreshing proactively..."
      );

      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error(
          "[AUTH-FETCH] ❌ Proactive refresh failed:",
          error.message
        );
        return false;
      }

      if (session) {
        console.log("[AUTH-FETCH] ✅ Proactive refresh successful");
        return true;
      }

      return false;
    }

    return true; // Session is valid
  } catch (error) {
    console.error("[AUTH-FETCH] ❌ Error checking session:", error);
    return false;
  }
}
