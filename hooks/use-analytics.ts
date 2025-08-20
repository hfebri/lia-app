"use client";

import { useState, useEffect, useCallback } from "react";

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalFiles: number;
  averageMessagesPerConversation: number;
  popularTopics: { topic: string; count: number }[];
  dailyActiveUsers: { date: string; count: number }[];
  messageVolume: { date: string; count: number }[];
  fileUploads: { date: string; count: number }[];
  userGrowth: { date: string; newUsers: number; totalUsers: number }[];
  responseTime: { date: string; avgTime: number }[];
}

export interface UsageMetrics {
  today: {
    messages: number;
    conversations: number;
    files: number;
    activeUsers: number;
  };
  thisWeek: {
    messages: number;
    conversations: number;
    files: number;
    activeUsers: number;
  };
  thisMonth: {
    messages: number;
    conversations: number;
    files: number;
    activeUsers: number;
  };
  growth: {
    messages: number;
    conversations: number;
    files: number;
    users: number;
  };
}

export interface PopularTopic {
  topic: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  examples: string[];
}

export interface UseAnalyticsReturn {
  analyticsData: AnalyticsData | null;
  usageMetrics: UsageMetrics | null;
  popularTopics: PopularTopic[];
  isLoading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
  refreshUsageMetrics: () => Promise<void>;
  refreshPopularTopics: () => Promise<void>;
  setDateRange: (startDate: Date, endDate: Date) => void;
}

export function useAnalytics(): UseAnalyticsReturn {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const [popularTopics, setPopularTopics] = useState<PopularTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRangeState] = useState<{
    startDate: Date;
    endDate: Date;
  }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  });

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        setError(result.error || "Failed to fetch analytics data");
      }
    } catch (err) {
      setError("Failed to fetch analytics data");
      console.error("Analytics fetch error:", err);
    }
  }, [dateRange]);

  const fetchUsageMetrics = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/admin/analytics/usage");
      const result = await response.json();

      if (result.success) {
        setUsageMetrics(result.data);
      } else {
        setError(result.error || "Failed to fetch usage metrics");
      }
    } catch (err) {
      setError("Failed to fetch usage metrics");
      console.error("Usage metrics fetch error:", err);
    }
  }, []);

  const fetchPopularTopics = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/admin/analytics/topics");
      const result = await response.json();

      if (result.success) {
        setPopularTopics(result.data);
      } else {
        setError(result.error || "Failed to fetch popular topics");
      }
    } catch (err) {
      setError("Failed to fetch popular topics");
      console.error("Popular topics fetch error:", err);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    setIsLoading(true);
    await fetchAnalyticsData();
    setIsLoading(false);
  }, [fetchAnalyticsData]);

  const refreshUsageMetrics = useCallback(async () => {
    await fetchUsageMetrics();
  }, [fetchUsageMetrics]);

  const refreshPopularTopics = useCallback(async () => {
    await fetchPopularTopics();
  }, [fetchPopularTopics]);

  const setDateRange = useCallback((startDate: Date, endDate: Date) => {
    setDateRangeState({ startDate, endDate });
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchAnalyticsData(),
        fetchUsageMetrics(),
        fetchPopularTopics(),
      ]);
      setIsLoading(false);
    };

    fetchAllData();
  }, [fetchAnalyticsData, fetchUsageMetrics, fetchPopularTopics]);

  // Refetch when date range changes
  useEffect(() => {
    if (analyticsData) {
      fetchAnalyticsData();
    }
  }, [dateRange, fetchAnalyticsData, analyticsData]);

  return {
    analyticsData,
    usageMetrics,
    popularTopics,
    isLoading,
    error,
    refreshAnalytics,
    refreshUsageMetrics,
    refreshPopularTopics,
    setDateRange,
  };
}

// Hook for real-time metrics (updates every 30 seconds)
export function useRealTimeMetrics() {
  const [metrics, setMetrics] = useState<{
    activeUsers: number;
    onlineUsers: number;
    systemLoad: number;
    responseTime: number;
  } | null>(null);

  useEffect(() => {
    const fetchRealTimeMetrics = async () => {
      try {
        const response = await fetch("/api/admin/analytics/realtime");
        const result = await response.json();

        if (result.success) {
          setMetrics(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch real-time metrics:", error);
      }
    };

    // Initial fetch
    fetchRealTimeMetrics();

    // Set up interval for real-time updates
    const interval = setInterval(fetchRealTimeMetrics, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  return metrics;
}

// Hook for analytics alerts
export function useAnalyticsAlerts() {
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      type: "warning" | "error" | "info";
      title: string;
      message: string;
      timestamp: Date;
    }>
  >([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/admin/analytics/alerts");
        const result = await response.json();

        if (result.success) {
          setAlerts(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch analytics alerts:", error);
      }
    };

    fetchAlerts();

    // Check for new alerts every minute
    const interval = setInterval(fetchAlerts, 60000);

    return () => clearInterval(interval);
  }, []);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/admin/analytics/alerts/${alertId}`, {
        method: "DELETE",
      });

      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
    }
  }, []);

  return { alerts, dismissAlert };
}
