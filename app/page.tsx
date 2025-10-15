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
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  console.log("[HOME] render", {
    isLoading,
    isAuthenticated,
  });

  useEffect(() => {
    console.log("[HOME] effect auth check", {
      isLoading,
      isAuthenticated,
    });
    if (!isLoading && !isAuthenticated) {
      console.log("[HOME] redirecting to /signin");
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    console.log("[HOME] showing loading page (checking auth)");
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    console.log("[HOME] showing redirect loading page");
    return <LoadingPage message="Redirecting to sign in..." />;
  }

  console.log("[HOME] rendering dashboard");

  return (
    <DashboardLayout>
      <EnhancedChatInterface />
    </DashboardLayout>
  );
}
