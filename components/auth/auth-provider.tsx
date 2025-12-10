"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { createClient } from "../../lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { AuthUser, AuthContextType } from "../../lib/auth/types";
import { AUTH_CONFIG } from "../../lib/auth/config";
import { useRouter } from "next/navigation";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Debug flag - only log in development
const DEBUG = process.env.NODE_ENV === 'development';

// Cache configuration
const USER_CACHE_KEY = "lia-user-cache";
const USER_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface UserCache {
  user: AuthUser;
  timestamp: number;
  sessionId: string;
}

type ProfileFetchResult = "success" | "not_found" | "inactive" | "transient";

// Cache utility functions
function loadUserFromCache(): UserCache | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as UserCache;

    // Validate structure
    if (!data.user || !data.timestamp) {
      return null;
    }

    // Check if cache is too old
    if (Date.now() - data.timestamp > USER_CACHE_DURATION) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function saveUserToCache(data: UserCache): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to cache user:", error);
  }
}

function clearUserCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_CACHE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const [lastFetchResult, setLastFetchResult] = useState<ProfileFetchResult | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Refresh mutex to prevent concurrent refresh attempts
  const isRefreshingRef = useRef(false);

  const abortControllerRef = useCallback(() => {
    let controller: AbortController | null = null;
    return {
      get: () => controller,
      set: (newController: AbortController | null) => {
        controller = newController;
      },
      abort: () => {
        if (controller) {
          controller.abort();
          controller = null;
        }
      },
    };
  }, [])();

  const fetchUserProfile = useCallback(
    async (email: string, activeSession?: Session | null): Promise<ProfileFetchResult> => {
      setIsFetchingUser(true);

      // Create AbortController for this request
      const controller = new AbortController();
      abortControllerRef.set(controller);
      const timeoutId = setTimeout(() => {
        console.warn("[AUTH-PROVIDER] ⏱️ User profile request exceeded timeout - aborting");
        controller.abort();
      }, 15000);

      try {
        const response = await fetch("/api/auth/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
          signal: controller.signal,
        });

        if (response.ok) {
          const userData = await response.json();

          // Check if user is inactive (hard failure - force logout)
          if (!userData?.isActive) {
            console.warn("[AUTH-PROVIDER] ⚠️ User profile inactive - will force logout");
            setUser(null);
            clearUserCache();
            setLastFetchResult("inactive");
            await supabase.auth.signOut().catch(() => {});
            return "inactive";
          }

          setUser(userData);
          setLastFetchResult("success");

          // Save to cache
          const sessionToCache =
            activeSession ??
            (await supabase
              .auth
              .getSession()
              .catch(() => ({ data: { session: null } }))).data?.session ??
            null;

          if (sessionToCache?.user) {
            saveUserToCache({
              user: userData,
              timestamp: Date.now(),
              sessionId: sessionToCache.user.id,
            });
          }
          return "success";
        }

        console.error(
          "[AUTH-PROVIDER] ❌ Failed to fetch user profile:",
          response.status,
          response.statusText
        );

        // Only clear user and force logout on hard failures (404)
        if (response.status === 404) {
          console.warn("[AUTH-PROVIDER] ⚠️ User not found in DB (404) - will sign out");
          setUser(null);
          clearUserCache();
          setLastFetchResult("not_found");
          await supabase.auth.signOut().catch(() => {
            // Ignore signOut errors in cleanup
          });
          return "not_found";
        }

        // For all other errors (5xx, 401, network issues, etc), keep existing user
        console.warn(
          "[AUTH-PROVIDER] ⚠️ Transient error - keeping existing user state"
        );
        setLastFetchResult("transient");
        return "transient";
      } catch (error: any) {
        // Handle all errors: network failures, timeouts, aborts, JSON parsing, etc.
        if (error.name === "AbortError") {
          console.warn(
            "[AUTH-PROVIDER] ⚠️ User profile fetch was aborted - keeping existing user"
          );
        } else if (error.message?.includes("timeout")) {
          console.error(
            "[AUTH-PROVIDER] ❌ User profile fetch timed out - keeping existing user"
          );
        } else {
          console.error(
            "[AUTH-PROVIDER] ❌ Error fetching user profile - keeping existing user:",
            error
          );
        }

        // CRITICAL: Keep existing user on transient errors (network, timeout, abort)
        // Don't clear user or cache - keep last known good state
        setLastFetchResult("transient");
        return "transient";
      } finally {
        clearTimeout(timeoutId);
        abortControllerRef.set(null);
        // Always reset loading states, no matter what happens
        setIsFetchingUser(false);
        setIsLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      let shouldStayLoading = false; // Track if we need to keep loading state

      try {
        // Try cache first for instant load
        const cachedUser = loadUserFromCache();
        if (cachedUser) {
          setUser(cachedUser.user);
          setIsLoading(false); // Immediate render with cached data
        }

        // Then validate session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("[AUTH-PROVIDER] ❌ getSession error:", error.message);
          setSession(null);
          setUser(null);
          clearUserCache();
        } else if (session?.user) {
          setSession(session);

          // Check if cached user matches session
          if (!cachedUser || cachedUser.sessionId !== session.user.id) {
            // CRITICAL: Cache is for a different session (User A vs User B)
            // We MUST clear stale cache immediately before fetching
            if (cachedUser && cachedUser.sessionId !== session.user.id) {
              console.warn(
                "[AUTH-PROVIDER] ⚠️ Session ID mismatch - clearing stale cache from previous user"
              );
              setUser(null); // Clear stale user from UI immediately
              clearUserCache();
              setIsLoading(true); // Ensure loading state is active for fresh fetch
            }

            // Fetch fresh user data for the current session
            const result = await fetchUserProfile(session.user.email!, session);

            // Handle fetch results
            if (result === "not_found" || result === "inactive") {
              console.warn(
                `[AUTH-PROVIDER] ⚠️ Fatal error during initial session (${result}) - clearing user`
              );
              setUser(null);
              clearUserCache();
              // Can exit loading - this is a fatal error, not recoverable
            } else if (result === "transient") {
              // CRITICAL: On transient error, we MUST keep loading state
              // to prevent boot loop to /signin
              console.warn(
                "[AUTH-PROVIDER] ⚠️ Transient error during initial session - scheduling retry"
              );

              // Schedule a retry after a short delay
              setTimeout(async () => {
                const retryResult = await fetchUserProfile(session.user.email!, session);

                if (retryResult === "success") {
                  setIsLoading(false);
                } else if (retryResult === "not_found" || retryResult === "inactive") {
                  console.warn("[AUTH-PROVIDER] ⚠️ Profile fetch retry failed with fatal error");
                  setUser(null);
                  clearUserCache();
                  setIsLoading(false);
                } else {
                  // Still transient - give up and clear loading after one retry
                  console.warn("[AUTH-PROVIDER] ⚠️ Profile fetch retry still failing - clearing loading state");
                  setIsLoading(false);
                }
              }, 2000); // Retry after 2 seconds

              // Signal to finally block to keep isLoading true for now
              shouldStayLoading = true;
            }
            // If result === "success", user is already set by fetchUserProfile
          }
          // else: use cached data (session matches), already set above
        } else {
          // No session, clear cache
          clearUserCache();
          setUser(null);
        }
      } catch (error) {
        console.error("[AUTH-PROVIDER] ❌ Unexpected error in getInitialSession:", error);
        setSession(null);
        setUser(null);
        clearUserCache();
      } finally {
        // CRITICAL: Only set loading to false if we're not waiting for retry
        // If shouldStayLoading is true, we have a valid session but transient error
        // Keep loading state so protected routes don't boot-loop to /signin
        if (!shouldStayLoading) {
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setSession(session);

        if (session?.user) {
          const result = await fetchUserProfile(session.user.email!, session);

          // Only clear user on fatal errors (not_found, inactive)
          // Keep existing user on transient errors
          if (result === "not_found" || result === "inactive") {
            console.warn(
              `[AUTH-PROVIDER] ⚠️ Fatal error during auth state change (${result}) - clearing user`
            );
            setUser(null);
            clearUserCache();
          } else if (result === "transient") {
            console.warn(
              "[AUTH-PROVIDER] ⚠️ Transient error during auth state change - keeping existing user"
            );
            // Keep existing user state
          }
          // If result === "success", user is already set by fetchUserProfile
        } else {
          setUser(null);
          clearUserCache(); // Clear cache on logout
        }
      } catch (error) {
        console.error("[AUTH-PROVIDER] ❌ Error in auth state change handler:", error);
        // Don't clear user on errors - fetchUserProfile handles clearing on fatal errors
        // Clearing here would wipe user on any transient error
      } finally {
        // Always reset loading state
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      // Cleanup: abort any pending user fetch on unmount
      abortControllerRef.abort();
    };
  }, [supabase, fetchUserProfile]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          ...AUTH_CONFIG.google,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }, [supabase]);

  const callServerSignOut = useCallback(async () => {
    try {
      const response = await fetch("/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.warn("[AUTH-PROVIDER] Server signOut failed:", body);
        return false;
      }

      return true;
    } catch (error) {
      console.warn("[AUTH-PROVIDER] Server signOut request error:", error);
      return false;
    }
  }, []);

  const completeSignOutNavigation = useCallback(() => {
    router.replace("/signin");
  }, [router]);

  const signOut = useCallback(async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      clearUserCache();

      // Then sign out from Supabase (remove scope to clear cookies properly)
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        console.warn("[AUTH-PROVIDER] Supabase signOut error (non-critical):", error);
      }

      await callServerSignOut();
      completeSignOutNavigation();
    } catch (error) {
      console.error("[AUTH-PROVIDER] SignOut error:", error);
      // Even if logout fails, clear local state and redirect
      setUser(null);
      setSession(null);
      clearUserCache();
      await callServerSignOut();
      completeSignOutNavigation();
    }
  }, [supabase, callServerSignOut, completeSignOutNavigation]);

  // Force logout - used internally when session exists but user data is invalid
  const forceLogout = useCallback(async () => {
    setUser(null);
    setSession(null);
    clearUserCache();

    try {
      await supabase.auth.signOut({ scope: "local" });
      await callServerSignOut();
    } catch (error) {
      console.warn("[AUTH-PROVIDER] Force logout signOut error:", error);
      await callServerSignOut();
    }

    completeSignOutNavigation();
  }, [supabase, callServerSignOut, completeSignOutNavigation]);

  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        return;
      }

      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user.email!, session);
      }
    } catch (error) {}
  }, [supabase, fetchUserProfile]);

  // Safe refresh with mutex to prevent race conditions
  const refreshSessionSafely = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('[AUTH-PROVIDER] ❌ Failed to refresh session:', error.message);

        // If refresh fails, check if we still have a valid session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
          console.warn('[AUTH-PROVIDER] ⚠️ No valid session after refresh failure - forcing logout');
          await forceLogout();
        }
        return;
      }

      if (refreshedSession) {
        setSession(refreshedSession);

        // Update user cache with fresh session
        if (refreshedSession.user?.email && user) {
          saveUserToCache({
            user,
            timestamp: Date.now(),
            sessionId: refreshedSession.user.id,
          });
        }
      }
    } catch (error) {
      console.error('[AUTH-PROVIDER] ❌ Error during session refresh:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [supabase, user, forceLogout]);

  // Check for authentication issues and auto-logout
  // Only logout if we're NOT currently fetching AND the last failure was fatal (not transient)
  useEffect(() => {
    // Only force logout if:
    // 1. Not currently loading/fetching
    // 2. Session exists but user is null
    // 3. Last fetch result was a FATAL error (not_found or inactive), NOT transient
    const shouldForceLogout =
      !isLoading &&
      !isFetchingUser &&
      session &&
      !user &&
      (lastFetchResult === "not_found" || lastFetchResult === "inactive");

    if (shouldForceLogout) {
      console.warn(
        `[AUTH-PROVIDER] ⚠️ Session exists but user not found due to fatal error (${lastFetchResult}) - forcing logout`
      );
      forceLogout();
    }
  }, [isLoading, isFetchingUser, session, user, lastFetchResult, forceLogout]);

  // Token refresh strategy:
  // 1. Supabase auto-refreshes 1/6 before expiry (e.g., 50min for 1hr tokens)
  // 2. We add proactive checks on visibility changes
  // 3. We add periodic background checks every 10 minutes
  useEffect(() => {
    if (!session) return;

    // Periodic background check - every 10 minutes
    const backgroundCheckInterval = setInterval(async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.expires_at) {
          const timeUntilExpiry = (currentSession.expires_at * 1000) - Date.now();
          const REFRESH_THRESHOLD = AUTH_CONFIG.tokenRefresh.earlyRefreshThreshold;

          if (timeUntilExpiry < REFRESH_THRESHOLD) {
            await refreshSessionSafely();
          }
        }
      } catch (error) {
        console.error('[AUTH-PROVIDER] ❌ Error in background token check:', error);
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();

          if (currentSession) {
            // Check if token is close to expiry (using configured threshold)
            const expiresAt = currentSession.expires_at;
            if (expiresAt) {
              const timeUntilExpiry = (expiresAt * 1000) - Date.now();
              const REFRESH_THRESHOLD = AUTH_CONFIG.tokenRefresh.earlyRefreshThreshold;

              if (timeUntilExpiry < REFRESH_THRESHOLD) {
                // Use the shared refresh function to avoid race conditions
                await refreshSessionSafely();
              }
            }
          }
        } catch (error) {
          console.error('[AUTH-PROVIDER] ❌ Error checking session on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(backgroundCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [supabase, session, refreshSessionSafely]);

  // Memoize the context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(
    () => ({
      user,
      session,
      isLoading,
      isFetchingUser,
      isAuthenticated: !!user && user.isActive,
      signInWithGoogle,
      signOut,
      refreshSession,
    }),
    [
      user,
      session,
      isLoading,
      isFetchingUser,
      signInWithGoogle,
      signOut,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export const useAuth = useAuthContext;
