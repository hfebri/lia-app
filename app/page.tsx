"use client";

import { useAuth } from "@/hooks/use-auth";
import { EnhancedChatInterface } from "@/components/chat/enhanced-chat-interface";
import { DashboardLayout } from "@/components/layout/app-layout";
import { LoadingPage } from "@/components/shared/loading";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Force dynamic rendering since we use useSearchParams in EnhancedChatInterface
export const dynamic = "force-dynamic";

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("[HOME] 📊 Auth state:", {
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      hasCompletedOnboarding: user?.hasCompletedOnboarding,
    });

    if (!isLoading && !isAuthenticated) {
      console.log("[HOME] ❌ Not authenticated - redirecting to /signin");
      router.push("/signin");
    } else if (!isLoading && isAuthenticated && user && !user.hasCompletedOnboarding) {
      console.log("[HOME] ⚠️ User hasn't completed onboarding - redirecting to /onboarding");
      router.push("/onboarding");
    } else if (!isLoading && isAuthenticated && user) {
      console.log("[HOME] ✅ Authenticated and onboarded - showing home page");
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <LoadingPage message="Redirecting to sign in..." />;
  }

  return (
    <DashboardLayout>
      <EnhancedChatInterface />
    </DashboardLayout>
  );
}
