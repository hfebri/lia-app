"use client";

import { useState } from "react";
import { useAuthContext } from "./auth-provider";
import { Button } from "../ui/button";

interface LogoutButtonProps {
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

export function LogoutButton({
  className,
  children,
  variant = "outline",
  size = "default",
}: LogoutButtonProps) {
  const { signOut, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    if (authLoading || isLoading || !isAuthenticated) return;

    try {
      setIsLoading(true);
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show logout button if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button
      onClick={handleSignOut}
      disabled={isLoading || authLoading}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          Signing out...
        </>
      ) : (
        children || "Sign out"
      )}
    </Button>
  );
}
