"use client";

import { useAuth } from "@/hooks/use-auth";
import { EnhancedChatInterface } from "@/components/chat/enhanced-chat-interface";
import { DashboardLayout } from "@/components/layout/app-layout";
import { LoadingPage } from "@/components/shared/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, MessageCircle, Shield } from "lucide-react";

export default function HomePage() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Authentication Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Please sign in to start chatting with LIA AI Assistant.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Brain className="h-4 w-4" />
                  <span>Access to AI-powered conversations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>Persistent chat history</span>
                </div>
              </div>
              <Button 
                onClick={signInWithGoogle} 
                className="w-full"
                size="lg"
              >
                Sign in to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <EnhancedChatInterface />
    </DashboardLayout>
  );
}
