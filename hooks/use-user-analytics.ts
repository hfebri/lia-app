"use client";

import { useState, useEffect } from "react";

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
}

interface UseUserAnalyticsReturn {
  data: UserAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserAnalytics(period: string = "30"): UseUserAnalyticsReturn {
  const [data, setData] = useState<UserAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/user/analytics?period=${period}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch analytics");
      }

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch analytics");
      }

      setData(result.data);
    } catch (err) {
      console.error("Error fetching user analytics:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}