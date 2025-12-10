"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  FileText,
  TrendingUp,
  Clock,
  Zap,
  Target,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Activity as ActivityIcon,
  Users,
  Activity,
} from "lucide-react";
import { ActivityChart } from "../../admin/_components/activity-chart";
import { FileAnalytics } from "../../admin/_components/file-analytics";
import { PopularTopics } from "../../admin/_components/popular-topics";
import { useUserAnalytics } from "@/hooks/use-user-analytics";
import { useActiveUsers } from "@/hooks/use-active-users";
import { DashboardSkeleton } from "../../admin/_components/dashboard-skeleton";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { useAuth } from "@/components/auth/auth-provider";

export function DashboardOverview() {
  const { user } = useAuth();
  const {
    filters,
    setDateRange,
    setSelectedUserId,
    resetFilters,
    hasActiveFilters,
  } = useDashboardFilters();
  const [chartViewDays, setChartViewDays] = useState<string>("7");

  const { data: analytics, isLoading, error, refetch } = useUserAnalytics({
    userId: filters.selectedUserId,
    startDate: filters.dateRange?.from,
    endDate: filters.dateRange?.to,
  });

  const { data: activeUsers, isLoading: isLoadingActiveUsers, error: activeUsersError, isAdmin: isAdminForMetrics } = useActiveUsers();

  const isAdmin = user?.role === "admin";

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

  // Filter chart data based on selected view period
  const getFilteredChartData = () => {
    if (!analytics?.chartData) return undefined;

    const days = parseInt(chartViewDays);
    const allData = analytics.chartData;

    // If the data is less than or equal to requested days, return all
    if (allData.length <= days) return allData;

    // Return the last N days
    return allData.slice(-days);
  };

  const filteredChartData = getFilteredChartData();

  return (
    <div className="space-y-6">
      {/* Dashboard Filters */}
      <DashboardFilters
        dateRange={filters.dateRange}
        selectedUserId={filters.selectedUserId}
        onDateRangeChange={setDateRange}
        onUserIdChange={setSelectedUserId}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        isAdmin={isAdmin}
      />

      {/* Main Tabs - Activity vs Productivity */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-1">
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6 space-y-6">
      {/* Active Users Stats - Admin Only */}
      {isAdminForMetrics && activeUsersError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load active users metrics: {activeUsersError}
          </AlertDescription>
        </Alert>
      )}
      {isAdminForMetrics && !activeUsersError && (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500 h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Real-time Active
            </CardTitle>
            <Activity className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
              {isLoadingActiveUsers ? "..." : activeUsers?.realTimeActive.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              {(activeUsers?.trends?.realTime || 0) !== 0 ? (
                <>
                  <span className={`font-medium ${
                    (activeUsers?.trends?.realTime || 0) > 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {(activeUsers?.trends?.realTime || 0) > 0 ? "+" : ""}{activeUsers?.trends?.realTime}%
                  </span>
                  <span className="ml-1">vs yesterday</span>
                </>
              ) : (
                <span>Last 15 minutes</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500 h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Active Users
            </CardTitle>
            <Users className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
              {isLoadingActiveUsers ? "..." : activeUsers?.dailyActive.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              {(activeUsers?.trends?.daily || 0) !== 0 ? (
                <>
                  <span className={`font-medium ${
                    (activeUsers?.trends?.daily || 0) > 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {(activeUsers?.trends?.daily || 0) > 0 ? "+" : ""}{activeUsers?.trends?.daily}%
                  </span>
                  <span className="ml-1">vs yesterday</span>
                </>
              ) : (
                <span>Last 24 hours</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500 h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly Active Users
            </CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">
              {isLoadingActiveUsers ? "..." : activeUsers?.weeklyActive.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              {(activeUsers?.trends?.weekly || 0) !== 0 ? (
                <>
                  <span className={`font-medium ${
                    (activeUsers?.trends?.weekly || 0) > 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {(activeUsers?.trends?.weekly || 0) > 0 ? "+" : ""}{activeUsers?.trends?.weekly}%
                  </span>
                  <span className="ml-1">vs yesterday</span>
                </>
              ) : (
                <span>Last 7 days</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500 h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Active Users
            </CardTitle>
            <Users className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-1">
              {isLoadingActiveUsers ? "..." : activeUsers?.monthlyActive.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              {(activeUsers?.trends?.monthly || 0) !== 0 ? (
                <>
                  <span className={`font-medium ${
                    (activeUsers?.trends?.monthly || 0) > 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {(activeUsers?.trends?.monthly || 0) > 0 ? "+" : ""}{activeUsers?.trends?.monthly}%
                  </span>
                  <span className="ml-1">vs yesterday</span>
                </>
              ) : (
                <span>Last 30 days</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
      )}

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
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-lg mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Activity Overview
                </CardTitle>
                <CardDescription>
                  {!filteredChartData
                    ? "Loading activity data..."
                    : filteredChartData.length > 0
                    ? `Showing ${filteredChartData.length} day${filteredChartData.length !== 1 ? "s" : ""} of activity`
                    : "No activity in the selected period"}
                </CardDescription>
              </div>
              <Select value={chartViewDays} onValueChange={setChartViewDays}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityChart data={filteredChartData} />
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
    </TabsContent>
  </Tabs>
  </div>
);
}
