"use client";

import { AdminGuard } from "@/components/auth/admin-guard";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { UsageMetrics } from "@/components/admin/usage-metrics";
import { ModelUsageFilters } from "@/components/admin/model-usage-filters";
import { ModelUsageTable } from "@/components/admin/model-usage-table";
import { ModelUsageCharts } from "@/components/admin/model-usage-charts";
import { useAnalytics } from "@/hooks/use-analytics";
import { useModelUsage } from "@/hooks/use-model-usage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  BarChart3,
  RefreshCw,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Cpu,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function AdminAnalyticsPage() {
  const {
    analyticsData,
    usageMetrics,
    popularTopics,
    isLoading,
    error,
    refreshAnalytics,
    refreshUsageMetrics,
  } = useAnalytics();

  const {
    userStats,
    globalStats,
    isLoading: isLoadingModelUsage,
    error: modelUsageError,
    filters: modelFilters,
    setFilters: setModelFilters,
    refresh: refreshModelUsage,
  } = useModelUsage();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; name: string | null; email: string }>
  >([]);
  const [availableModels, setAvailableModels] = useState<
    Array<{ id: string; name: string; provider: string }>
  >([]);

  // Fetch available users and models for filters
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        // Fetch users
        const usersResponse = await fetch("/api/admin/users");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          if (usersData.isSuccess && usersData.data) {
            setAvailableUsers(
              usersData.data.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
              }))
            );
          }
        }

        // Fetch models
        const modelsResponse = await fetch("/api/ai/models");
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          if (modelsData.success && modelsData.data?.models) {
            setAvailableModels(
              modelsData.data.models.map((m: any) => ({
                id: m.id,
                name: m.name,
                provider: m.provider,
              }))
            );
          }
        }
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    }

    fetchFilterOptions();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshAnalytics(),
      refreshUsageMetrics(),
      refreshModelUsage(),
    ]);
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // Implementation for exporting analytics data

  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </AdminGuard>
    );
  }

  if (error) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <div className="text-destructive mb-4">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">
                  Error Loading Analytics
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">
                Analytics Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground">
              Platform usage statistics, trends, and insights
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  System Status
                </p>
                <p className="text-2xl font-bold text-green-600">Operational</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Data Quality
                </p>
                <p className="text-2xl font-bold">98.5%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </p>
                <p className="text-2xl font-bold">Just now</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </CardContent>
          </Card>
        </div>

        {/* Usage Metrics */}
        {usageMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Usage Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <UsageMetrics data={usageMetrics} />
            </CardContent>
          </Card>
        )}

        {/* Analytics Charts */}
        {analyticsData && (
          <Card>
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsCharts
                dailyActiveUsers={analyticsData.dailyActiveUsers}
                messageVolume={analyticsData.messageVolume}
                fileUploads={analyticsData.fileUploads}
                userGrowth={analyticsData.userGrowth}
                responseTime={analyticsData.responseTime}
                popularTopics={analyticsData.popularTopics}
              />
            </CardContent>
          </Card>
        )}

        {/* Popular Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Popular Topics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {popularTopics.map((topic, index) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{topic.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {topic.examples[0]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{topic.count}</Badge>
                    <Badge
                      variant={
                        topic.trend === "up"
                          ? "default"
                          : topic.trend === "down"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {topic.trend === "up"
                        ? "↗"
                        : topic.trend === "down"
                        ? "↘"
                        : "→"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">
                      User engagement is up 23% this month
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Document analysis feature is gaining popularity
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      Peak usage hours: 9-11 AM and 2-4 PM
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Usage Analytics - NEW SECTION */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Cpu className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Model Usage Analytics</CardTitle>
                <CardDescription>
                  Track which AI models users prefer and usage patterns across
                  different providers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <ModelUsageFilters
              filters={modelFilters}
              onFilterChange={setModelFilters}
              availableUsers={availableUsers}
              availableModels={availableModels}
            />

            {/* Loading State */}
            {isLoadingModelUsage && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {/* Error State */}
            {modelUsageError && !isLoadingModelUsage && (
              <div className="flex items-center justify-center py-12">
                <Card className="max-w-md mx-auto">
                  <CardContent className="p-6 text-center">
                    <div className="text-destructive mb-4">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                      <h3 className="text-lg font-semibold">
                        Error Loading Model Usage
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {modelUsageError}
                    </p>
                    <Button onClick={refreshModelUsage}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Content - Tabs */}
            {!isLoadingModelUsage && !modelUsageError && (
              <Tabs defaultValue="table" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="table">User Breakdown</TabsTrigger>
                  <TabsTrigger value="charts">Visual Analytics</TabsTrigger>
                </TabsList>
                <TabsContent value="table" className="mt-6">
                  <ModelUsageTable data={userStats} />
                </TabsContent>
                <TabsContent value="charts" className="mt-6">
                  <ModelUsageCharts data={globalStats} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
