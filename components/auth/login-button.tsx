"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Button } from "../ui/button";

interface LoginButtonProps {
  className?: string;
  children?: React.ReactNode;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function LoginButton({
  className,
  children,
  variant = "default",
  size = "default",
}: LoginButtonProps) {
  const { signInWithGoogle, user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (authLoading || isLoading || !!user) return;

    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show login button if already authenticated
  if (!!user) {
    return null;
  }

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading || authLoading}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          Signing in...
        </>
      ) : (
        children || "Sign in with Google"
      )}
    </Button>
  );
}
