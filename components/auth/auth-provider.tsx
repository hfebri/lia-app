"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { createClient } from "../../lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { AuthUser, AuthContextType } from "../../lib/auth/types";
import { AUTH_CONFIG } from "../../lib/auth/config";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache configuration
const USER_CACHE_KEY = "lia-user-cache";
const USER_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface UserCache {
  user: AuthUser;
  timestamp: number;
  sessionId: string;
}

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

  const supabase = useMemo(() => createClient(), []);

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
    async (email: string) => {
      console.log("[AUTH-PROVIDER] 🔄 Fetching user profile for:", email);
      setIsFetchingUser(true);

      // Create AbortController only if it doesn't exist
      // Don't abort existing requests - let them complete
      if (!abortControllerRef.get()) {
        const controller = new AbortController();
        abortControllerRef.set(controller);
      }

      try {
        const response = await fetch("/api/auth/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
          signal: abortControllerRef.get()?.signal,
        });

        if (response.ok) {
          const userData = await response.json();
          console.log("[AUTH-PROVIDER] ✅ User profile fetched:", {
            email: userData.email,
            hasCompletedOnboarding: userData.hasCompletedOnboarding,
          });
          setUser(userData);

          // Save to cache
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log("[AUTH-PROVIDER] 💾 Saving user to cache");
            saveUserToCache({
              user: userData,
              timestamp: Date.now(),
              sessionId: session.user.id,
            });
          }
        } else {
          console.error("[AUTH-PROVIDER] ❌ Failed to fetch user profile:", response.status, response.statusText);
          setUser(null);
          clearUserCache();
          // If user not found in DB, sign them out from Supabase too
          if (response.status === 404) {
            console.warn("[AUTH-PROVIDER] ⚠️ User not found in DB (404) - signing out");
            await supabase.auth.signOut();
          }
        }
      } catch (error: any) {
        // Ignore abort errors
        if (error.name !== "AbortError") {
          console.error("[AUTH-PROVIDER] ❌ Error fetching user profile:", error);
          setUser(null);
        }
      } finally {
        setIsFetchingUser(false);
        setIsLoading(false);
        console.log("[AUTH-PROVIDER] ✅ Fetch user profile complete");
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log("[AUTH-PROVIDER] 🚀 Getting initial session...");
      try {
        // Try cache first for instant load
        const cachedUser = loadUserFromCache();
        if (cachedUser) {
          console.log("[AUTH-PROVIDER] 📦 Cached user found:", cachedUser.user.email);
          setUser(cachedUser.user);
          setIsLoading(false); // Immediate render with cached data
        } else {
          console.log("[AUTH-PROVIDER] 📦 No cached user found");
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
          console.log("[AUTH-PROVIDER] ✅ Supabase session found for:", session.user.email);
          setSession(session);

          // Check if cached user matches session
          if (!cachedUser || cachedUser.sessionId !== session.user.id) {
            console.log("[AUTH-PROVIDER] 🔄 Cache miss or different session - fetching fresh data");
            // Fetch fresh user data if cache miss or different session
            await fetchUserProfile(session.user.email!);
          } else {
            console.log("[AUTH-PROVIDER] ✅ Using cached user data");
          }
          // else: use cached data, already set above
        } else {
          console.log("[AUTH-PROVIDER] ❌ No Supabase session found");
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
        setIsLoading(false);
        console.log("[AUTH-PROVIDER] ✅ Initial session check complete");
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AUTH-PROVIDER] 🔔 Auth state changed:", event, session?.user?.email);
      setSession(session);

      if (session?.user) {
        console.log("[AUTH-PROVIDER] ✅ Session exists - fetching user profile");
        await fetchUserProfile(session.user.email!);
        setIsLoading(false);
      } else {
        console.log("[AUTH-PROVIDER] ❌ No session - clearing user data");
        setUser(null);
        clearUserCache(); // Clear cache on logout
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
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.warn("[AUTH-PROVIDER] Server signOut failed:", body);
      }
    } catch (error) {
      console.warn("[AUTH-PROVIDER] Server signOut request error:", error);
    }
  }, []);

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

      window.location.href = "/signin";
    } catch (error) {
      console.error("[AUTH-PROVIDER] SignOut error:", error);
      // Even if logout fails, clear local state and redirect
      setUser(null);
      setSession(null);
      clearUserCache();
      await callServerSignOut();
      window.location.href = "/signin";
    }
  }, [supabase, callServerSignOut]);

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

    window.location.href = "/signin";
  }, [supabase, callServerSignOut]);

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
        await fetchUserProfile(session.user.email!);
      }
    } catch (error) {}
  }, [supabase, fetchUserProfile]);

  // Check for authentication issues and auto-logout
  // Only logout if we're NOT currently fetching the user profile
  useEffect(() => {
    if (!isLoading && !isFetchingUser && session && !user) {
      console.warn("⚠️ Session exists but user not found - forcing logout");
      forceLogout();
    }
  }, [isLoading, isFetchingUser, session, user, forceLogout]);

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
