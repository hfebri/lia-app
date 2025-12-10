"use client";

import { AdminGuard } from "@/components/auth/admin-guard";
import { ModelUsageTable } from "@/components/admin/model-usage-table";
import { ModelUsageCharts } from "@/components/admin/model-usage-charts";
import { TopUsersByModel } from "@/components/admin/top-users-by-model";
import { useModelUsage } from "@/hooks/use-model-usage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  Cpu,
  RefreshCw,
  AlertCircle,
  CalendarIcon,
  X,
  BarChart3,
  Table,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function ModelUsagePage() {
  const {
    userStats,
    globalStats,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
  } = useModelUsage();

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

  const hasActiveFilters = filters.userId || filters.modelId;

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof availableModels>);

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Cpu className="h-8 w-8 text-primary" />
              Model Usage Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Track which AI models users prefer and usage patterns across different providers
            </p>
          </div>
          <Button onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter model usage data by date range, user, and model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(filters.startDate, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => date && setFilters({ startDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">to</span>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(filters.endDate, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => date && setFilters({ endDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* User Filter */}
              <Select
                value={filters.userId || "all"}
                onValueChange={(value) =>
                  setFilters({ userId: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Model Filter */}
              <Select
                value={filters.modelId || "all"}
                onValueChange={(value) =>
                  setFilters({ modelId: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {Object.entries(modelsByProvider).map(([provider, models]) => (
                    <SelectGroup key={provider}>
                      <SelectLabel className="capitalize">{provider}</SelectLabel>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={() => setFilters({ userId: undefined, modelId: undefined })}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={refresh} className="ml-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Content Tabs */}
        {!isLoading && !error && (
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Table className="h-4 w-4" />
                User Breakdown
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Visual Analytics
              </TabsTrigger>
              <TabsTrigger value="rankings" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Top Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-6">
              <ModelUsageTable data={userStats} />
            </TabsContent>

            <TabsContent value="charts" className="mt-6">
              <ModelUsageCharts data={globalStats} />
            </TabsContent>

            <TabsContent value="rankings" className="mt-6">
              <TopUsersByModel
                users={userStats}
                modelName={
                  filters.modelId
                    ? availableModels.find((m) => m.id === filters.modelId)?.name
                    : undefined
                }
                modelId={filters.modelId}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminGuard>
  );
}
