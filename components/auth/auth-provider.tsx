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
          setUser(userData);
        } else {
          const errorText = await response.text();
          setUser(null);
          // If user not found in DB, sign them out from Supabase too
          if (response.status === 404) {
            await supabase.auth.signOut();
          }
        }
      } catch (error: any) {
        // Ignore abort errors
        if (error.name !== "AbortError") {
          setUser(null);
        }
      } finally {
        setIsFetchingUser(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          if (session?.user) {
            await fetchUserProfile(session.user.email!);
          } else {
          }
        }
      } catch (error) {
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (session?.user) {
        await fetchUserProfile(session.user.email!);
      } else {
        setUser(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      // Cleanup: abort any pending user fetch on unmount
      abortControllerRef.abort();
    };
  }, [supabase, fetchUserProfile]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: AUTH_CONFIG.google.redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);

      // Then attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        console.warn("Supabase signOut error (non-critical):", error);
        // Don't throw error for logout - we've already cleared local state
      }

      // Redirect to sign-in page after logout
      window.location.href = "/signin";
    } catch (error) {
      console.error("SignOut error:", error);
      // Even if logout fails, clear local state and redirect
      setUser(null);
      setSession(null);
      window.location.href = "/signin";
    }
  }, [supabase]);

  // Force logout if user is not authenticated
  const forceLogout = useCallback(async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);

      // Attempt local logout (don't use global scope which might cause 403)
      await supabase.auth.signOut({ scope: "local" });

      window.location.href = "/signin";
    } catch (error) {
      console.warn("Force logout error (non-critical):", error);
      // Even if logout fails, redirect to signin
      window.location.href = "/signin";
    }
  }, [supabase]);

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
      isAuthenticated: !!user && user.isActive,
      signInWithGoogle,
      signOut,
      refreshSession,
      forceLogout,
    }),
    [
      user,
      session,
      isLoading,
      signInWithGoogle,
      signOut,
      refreshSession,
      forceLogout,
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
