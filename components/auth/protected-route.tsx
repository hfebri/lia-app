"use client";

import { useAuth } from "../../hooks/use-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginButton } from "./login-button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireActive?: boolean;
}

export function ProtectedRoute({
  children,
  fallback,
  redirectTo = "/",
  requireActive = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, forceLogout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("Protected route: User not authenticated, forcing logout");
      forceLogout();
    }
  }, [isAuthenticated, isLoading, forceLogout]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">
            You need to sign in to access this page.
          </p>
          <LoginButton />
        </div>
      </div>
    );
  }

  // Check if user is active (if required)
  if (requireActive && !user?.isActive) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Account Inactive</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been deactivated. Please contact support for
            assistance.
          </p>
          <LoginButton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
