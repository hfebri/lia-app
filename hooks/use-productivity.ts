import { useState, useEffect } from "react";

/**
 * Productivity Metrics Hooks
 *
 * React hooks for fetching productivity data from API endpoints
 */

interface ProductivityDashboardData {
  period: {
    type: "week" | "month";
    start: string;
    end: string;
  };
  current: {
    metrics: any;
    snapshots: any[];
    avgProductivityScore: number;
  };
  previous: {
    snapshots: any[];
    avgProductivityScore: number;
  };
  trend: {
    percentage: number;
    direction: "up" | "down" | "stable";
  };
}

interface UseProductivityDashboardResult {
  data: ProductivityDashboardData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch productivity dashboard data
 */
export function useProductivityDashboard(
  period: "week" | "month" = "week"
): UseProductivityDashboardResult {
  const [data, setData] = useState<ProductivityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/productivity/dashboard?period=${period}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch dashboard data");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      console.error("[useProductivityDashboard] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  return { data, loading, error, refetch: fetchData };
}

interface ProductivitySnapshot {
  id: string;
  userId: string;
  snapshotDate: string;
  conversationsCreated: number;
  messagesCreated: number;
  filesProcessed: number;
  activeSessions: number;
  totalActiveTime: number;
  dailyActivityScore: number;
  dailyEngagementScore: number;
  dailyEfficiencyScore: number;
  dailyValueScore: number;
  dailyProductivityScore: number;
  activityByHour: any;
  modelsUsed: any;
  isComplete: number;
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface UseProductivitySnapshotsResult {
  data: ProductivitySnapshot[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch daily productivity snapshots for a date range
 */
export function useProductivitySnapshots(
  startDate: Date,
  endDate: Date
): UseProductivitySnapshotsResult {
  const [data, setData] = useState<ProductivitySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/productivity/snapshots?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch snapshots: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch snapshots");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      console.error("[useProductivitySnapshots] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate.toISOString(), endDate.toISOString()]);

  return { data, loading, error, refetch: fetchData };
}

interface ProductivityMetric {
  id: string;
  userId: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  totalConversations: number;
  totalMessages: number;
  totalUserMessages: number;
  totalAiMessages: number;
  totalFilesProcessed: number;
  activeDays: number;
  totalSessions: number;
  avgConversationLength: number;
  avgIterationDepth: number;
  complexityScore: number;
  conversationDiversity: number;
  avgTimeToFirstMessage: number;
  avgTimeBetweenMessages: number;
  avgSessionDuration: number;
  peakActivityHour: number;
  tokenEfficiency: number;
  avgMessagesPerConversation: number;
  fileProcessingRate: number;
  conversationCompletionRate: number;
  favoriteConversations: number;
  productivityScore: number;
  activityByDayOfWeek: any;
  activityByHour: any;
  topicBreakdown: any;
  modelUsage: any;
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface UseProductivityMetricsResult {
  data: ProductivityMetric | ProductivityMetric[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch detailed productivity metrics for a specific period or range
 */
export function useProductivityMetrics(
  periodType: "day" | "week" | "month",
  startDate: Date,
  endDate?: Date
): UseProductivityMetricsResult {
  const [data, setData] = useState<ProductivityMetric | ProductivityMetric[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/productivity/metrics?periodType=${periodType}&startDate=${startDate.toISOString()}`;
      if (endDate) {
        url += `&endDate=${endDate.toISOString()}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        // 404 is acceptable - metrics may not have been calculated yet
        if (response.status === 404) {
          setData(null);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch metrics");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      console.error("[useProductivityMetrics] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodType, startDate.toISOString(), endDate?.toISOString()]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Manually recalculate metrics for a period
 */
export async function recalculateMetrics(
  periodType: "day" | "week" | "month",
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  const response = await fetch("/api/productivity/metrics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }),
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || "Failed to recalculate metrics");
  }
}

/**
 * Manually recalculate snapshot for a specific date
 */
export async function recalculateSnapshot(date: Date): Promise<void> {
  const response = await fetch("/api/productivity/snapshots", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      date: date.toISOString(),
    }),
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || "Failed to recalculate snapshot");
  }
}
