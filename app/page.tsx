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

  if (process.env.NODE_ENV !== "production") {
    console.debug("[HOME] render", { isLoading, isAuthenticated });
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[HOME] redirecting to /signin");
      }
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[HOME] showing auth loading page");
    }
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[HOME] showing redirect loader");
    }
    return <LoadingPage message="Redirecting to sign in..." />;
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[HOME] rendering dashboard");
  }

  return (
    <DashboardLayout>
      <EnhancedChatInterface />
    </DashboardLayout>
  );
}
