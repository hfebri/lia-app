"use client";

import React, { useState, useEffect, useCallback } from "react";
import type {
  UserModelUsage,
  GlobalModelUsage,
} from "@/lib/services/analytics";

interface ModelUsageFilters {
  startDate: Date;
  endDate: Date;
  userId?: string;
  modelId?: string;
}

export interface UseModelUsageReturn {
  userStats: UserModelUsage[];
  globalStats: GlobalModelUsage[];
  isLoading: boolean;
  error: string | null;
  filters: ModelUsageFilters;
  setFilters: (filters: Partial<ModelUsageFilters>) => void;
  refresh: () => Promise<void>;
}

// Helper function to get start of day
const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper function to get end of day
const getEndOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export function useModelUsage(): UseModelUsageReturn {
  const [userStats, setUserStats] = useState<UserModelUsage[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalModelUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ModelUsageFilters>({
    startDate: getStartOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Start of day 30 days ago
    endDate: getEndOfDay(new Date()), // End of today
    userId: undefined,
    modelId: undefined,
  });

  // Track request ID to handle race conditions
  const requestIdRef = React.useRef(0);

  const fetchData = useCallback(async () => {
    // Increment request ID for this fetch
    const currentRequestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
      });

      if (filters.userId) {
        params.set("userId", filters.userId);
      }
      if (filters.modelId) {
        params.set("modelId", filters.modelId);
      }

      const response = await fetch(
        `/api/admin/analytics/model-usage?${params}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const result = await response.json();

      // Only update state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        if (result.success) {
          setUserStats(result.data.userStats || []);
          setGlobalStats(result.data.globalStats || []);
        } else {
          setError(result.error || "Failed to fetch model usage");
        }
      }
    } catch (err) {
      // Only update error if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        console.error("Error fetching model usage:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch model usage"
        );
      }
    } finally {
      // Only update loading state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters]);

  const setFilters = useCallback((newFilters: Partial<ModelUsageFilters>) => {
    setFiltersState((prev) => {
      const updated = { ...prev, ...newFilters };
      // Normalize dates to full days
      if (newFilters.startDate) {
        updated.startDate = getStartOfDay(newFilters.startDate);
      }
      if (newFilters.endDate) {
        updated.endDate = getEndOfDay(newFilters.endDate);
      }
      return updated;
    });
  }, []);

  // Initial fetch and refetch when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    userStats,
    globalStats,
    isLoading,
    error,
    filters,
    setFilters,
    refresh: fetchData,
  };
}
