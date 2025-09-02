"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "../ui/button";
import { LogIn, LogOut } from "lucide-react";

interface AuthButtonProps {
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  loginText?: string;
  logoutText?: string;
}

export function AuthButton({
  className,
  variant = "default",
  size = "default",
  showIcon = true,
  loginText = "Sign in with Google",
  logoutText = "Sign out",
}: AuthButtonProps) {
  const { user, isAuthenticated, isLoading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    if (authLoading || isLoading) return;

    try {
      setIsLoading(true);
      if (isAuthenticated) {
        await signOut();
      } else {
        await signInWithGoogle();
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || authLoading;
  const isLoggedIn = isAuthenticated && user;

  return (
    <Button
      onClick={handleAuth}
      disabled={loading}
      className={className}
      variant={variant}
      size={size}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          {isLoggedIn ? "Signing out..." : "Signing in..."}
        </>
      ) : (
        <>
          {showIcon && (
            <>
              {isLoggedIn ? (
                <LogOut className="mr-2 h-4 w-4" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
            </>
          )}
          {isLoggedIn ? logoutText : loginText}
        </>
      )}
    </Button>
  );
}