"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LandingLayout } from "@/components/layout/app-layout";
import {
  Bot,
  MessageSquare,
  FileText,
  BookTemplate,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

function HomePage() {
  const { user, status, hasRole } = useAuth();

  if (status === "authenticated" && user) {
    // Show dashboard for authenticated users
    return (
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6 py-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bot className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome back, {user.name || user.email}!
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Continue your AI-powered journey. Start a conversation, explore
            templates, or upload files for analysis.
          </p>
          {hasRole("admin") && (
            <Badge variant="secondary" className="text-lg py-2 px-4">
              🔧 Admin Access Available
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle>Start Chatting</CardTitle>
              <CardDescription>
                Begin a new conversation with our AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/chat">
                  Start Chat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <BookTemplate className="h-10 w-10 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle>Browse Templates</CardTitle>
              <CardDescription>
                Use pre-built templates to get started quickly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/templates">
                  View Templates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                Upload documents for AI analysis and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/files">
                  Manage Files
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Section */}
        {hasRole("admin") && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>Admin Dashboard</span>
              </CardTitle>
              <CardDescription>
                Access administrative features and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/admin">
                  Open Admin Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Bot className="h-16 w-16 text-primary animate-pulse" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          Welcome to LIA App
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          AI Platform powered by AI Model API. Experience intelligent
          conversations, document analysis, and powerful templates to boost your
          productivity.
        </p>

        <div className="pt-6">
          {status === "loading" ? (
            <Button disabled size="lg" className="text-lg px-8 py-4">
              Loading...
            </Button>
          ) : (
            <LoginButton
              size="lg"
              className="text-lg px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </LoginButton>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card>
          <CardHeader className="text-center">
            <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>AI Conversations</CardTitle>
            <CardDescription>
              Chat with advanced AI models for answers, creative writing, and
              problem-solving
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Document Analysis</CardTitle>
            <CardDescription>
              Upload and analyze documents with AI-powered insights and
              summaries
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <BookTemplate className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Smart Templates</CardTitle>
            <CardDescription>
              Use pre-built templates for common tasks like emails, reports, and
              creative writing
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Authentication Status */}
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <p className="text-muted-foreground">Checking authentication...</p>
          )}

          {status === "unauthenticated" && (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Sign in to access all features
              </p>
              <LoginButton className="w-full">Sign in with Google</LoginButton>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  return (
    <LandingLayout>
      <HomePage />
    </LandingLayout>
  );
}
