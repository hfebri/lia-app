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

  const supabase = useMemo(() => createClient(), []);

  const fetchUserProfile = useCallback(
    async (email: string) => {
      console.log("🔍 Fetching user profile for email:", email);
      try {
        const response = await fetch("/api/auth/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        console.log("📡 User profile API response status:", response.status);

        if (response.ok) {
          const userData = await response.json();
          console.log("✅ User profile fetched successfully:", userData);
          setUser(userData);
        } else {
          console.error("❌ Failed to fetch user profile", response.status);
          const errorText = await response.text();
          console.error("❌ Error response:", errorText);
          setUser(null);
          // If user not found in DB, sign them out from Supabase too
          if (response.status === 404) {
            console.log("🔄 User not found in DB, signing out from Supabase");
            await supabase.auth.signOut();
          }
        }
      } catch (error) {
        console.error("💥 Error fetching user profile:", error);
        setUser(null);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("🚀 Getting initial session...");
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log("📱 Initial session result:", { session: !!session, error, userEmail: session?.user?.email });

        if (error) {
          console.error("❌ Error getting session:", error);
          setSession(null);
          setUser(null);
        } else {
          console.log("✅ Setting session state");
          setSession(session);
          if (session?.user) {
            console.log("👤 Session has user, fetching profile for:", session.user.email);
            await fetchUserProfile(session.user.email!);
          } else {
            console.log("❌ No user in initial session");
          }
        }
      } catch (error) {
        console.error("💥 Error in getInitialSession:", error);
        setSession(null);
        setUser(null);
      } finally {
        console.log("🏁 Initial session loading complete");
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change event:", event);
      console.log("📱 Session object:", session);
      console.log("👤 Session user:", session?.user);
      
      setSession(session);

      if (session?.user) {
        console.log("✅ User found in session, fetching profile for:", session.user.email);
        await fetchUserProfile(session.user.email!);
      } else {
        console.log("❌ No user in session, clearing user state");
        setUser(null);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUserProfile]);

  const signInWithGoogle = async () => {
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
        console.error("Error signing in with Google:", error);
        throw error;
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        throw error;
      }
      setUser(null);
      setSession(null);
      // Redirect to home page after logout
      window.location.href = '/';
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  // Force logout if user is not authenticated
  const forceLogout = useCallback(async () => {
    console.log("Forcing logout - user not authenticated");
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      window.location.href = '/';
    } catch (error) {
      console.error("Error during force logout:", error);
    }
  }, [supabase]);

  const refreshSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Error refreshing session:", error);
        return;
      }

      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user.email!);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  };

  // Check for authentication issues and auto-logout
  useEffect(() => {
    if (!isLoading && session && !user) {
      console.log("Session exists but no user profile - forcing logout");
      forceLogout();
    }
  }, [isLoading, session, user, forceLogout]);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && user.isActive,
    signInWithGoogle,
    signOut,
    refreshSession,
    forceLogout,
  };

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
