"use client";

import { useState, useEffect } from "react";

interface PopularTopic {
  topic: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  examples: string[];
}

interface UserAnalytics {
  stats: {
    totalConversations: number;
    totalMessages: number;
    filesProcessed: number;
    averageResponseTime: string;
  };
  trends: {
    conversations: string;
    messages: string;
    files: string;
    responseTime: string;
  };
  chartData: Array<{
    day: string;
    date: string;
    messages: number;
    conversations: number;
  }>;
  recentConversations: Array<{
    id: string;
    title: string;
    lastMessage: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  fileAnalytics: {
    totalFiles: number;
    types: {
      pdf: number;
      docx: number;
      txt: number;
      other: number;
    };
  };
  popularTopics?: PopularTopic[];
}

interface UseUserAnalyticsParams {
  period?: string;
  userId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

interface UseUserAnalyticsReturn {
  data: UserAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserAnalytics(params: UseUserAnalyticsParams = {}): UseUserAnalyticsReturn {
  const { period = "30", userId = null, startDate = null, endDate = null } = params;
  const [data, setData] = useState<UserAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append("period", period);

      // Always send userId parameter - use empty string for "all users"
      if (userId !== null && userId !== undefined) {
        queryParams.append("userId", userId);
      } else if (userId === null) {
        // Explicitly send empty string to indicate "all users" mode
        queryParams.append("userId", "");
      }

      if (startDate && endDate) {
        queryParams.append("startDate", startDate.toISOString().split("T")[0]);
        queryParams.append("endDate", endDate.toISOString().split("T")[0]);
      }

      const response = await fetch(`/api/user/analytics?${queryParams.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch analytics");
      }

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch analytics");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, userId, startDate?.toISOString(), endDate?.toISOString()]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}