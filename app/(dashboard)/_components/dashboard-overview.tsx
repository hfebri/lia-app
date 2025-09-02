"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  FileText,
  Users,
  TrendingUp,
  Clock,
  Zap,
  Target,
  Plus,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { ActivityChart } from "../../(admin)/_components/activity-chart";
import { RecentConversations } from "../../(admin)/_components/recent-conversations";
import { FileAnalytics } from "../../(admin)/_components/file-analytics";
import { PopularTopics } from "../../(admin)/_components/popular-topics";
import { useUserAnalytics } from "@/hooks/use-user-analytics";
import { DashboardSkeleton } from "../../(admin)/_components/dashboard-skeleton";

export function DashboardOverview() {
  const { data: analytics, isLoading, error, refetch } = useUserAnalytics();

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
        }),
      });

      if (response.ok) {
        // Refresh the analytics data to get updated conversation list
        refetch();
      } else {
        throw new Error("Failed to rename conversation");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh only the analytics data to update the conversation list
        // This avoids a full page reload and just updates the dashboard data
        refetch();
      } else {
        throw new Error("Failed to delete conversation");
      }
    } catch (error) {
      throw error;
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load dashboard data: {error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
        <DashboardSkeleton />
      </div>
    );
  }

  const stats = analytics?.stats || {
    totalConversations: 0,
    totalMessages: 0,
    filesProcessed: 0,
    averageResponseTime: "0s",
  };

  const trends = analytics?.trends || {
    conversations: "0%",
    messages: "0%",
    files: "0%",
    responseTime: "0%",
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500 h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversations
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
              {stats.totalConversations.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <span
                className={`font-medium ${
                  trends.conversations.startsWith("+")
                    ? "text-green-600"
                    : trends.conversations.startsWith("-")
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {trends.conversations}
              </span>
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500 h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Messages
            </CardTitle>
            <Zap className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
              {stats.totalMessages.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <span
                className={`font-medium ${
                  trends.messages.startsWith("+")
                    ? "text-green-600"
                    : trends.messages.startsWith("-")
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {trends.messages}
              </span>
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500 h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Files Processed
            </CardTitle>
            <FileText className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">
              {stats.filesProcessed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <span
                className={`font-medium ${
                  trends.files.startsWith("+")
                    ? "text-green-600"
                    : trends.files.startsWith("-")
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {trends.files}
              </span>
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500 h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Response Time
            </CardTitle>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-1">
              {stats.averageResponseTime}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <span
                className={`font-medium ${
                  trends.responseTime.startsWith("+")
                    ? "text-red-600"
                    : trends.responseTime.startsWith("-")
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                {trends.responseTime}
              </span>
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Activity Overview
            </CardTitle>
            <CardDescription>
              Your usage patterns over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={analytics?.chartData} />
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Insights & Analytics
            </CardTitle>
            <CardDescription>
              File processing and popular topics analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="topics" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="topics" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Popular Topics
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  File Analytics
                </TabsTrigger>
              </TabsList>
              <TabsContent value="topics" className="mt-4">
                <PopularTopics data={analytics?.popularTopics} />
              </TabsContent>
              <TabsContent value="files" className="mt-4">
                <FileAnalytics data={analytics?.fileAnalytics} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-1">
        <Card className="hover:shadow-md transition-shadow border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-10 sm:h-11"
              size="default"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="truncate">Refresh Data</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
