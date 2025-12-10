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
    if (!isLoading && !isAuthenticated) {
      router.push("/signin");
    } else if (!isLoading && isAuthenticated && user && !user.hasCompletedOnboarding) {
      router.push("/onboarding");
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
