"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";

interface ActiveUserTrends {
  realTime: number;
  daily: number;
  weekly: number;
  monthly: number;
}

interface ActiveUserMetrics {
  realTimeActive: number;
  dailyActive: number;
  weeklyActive: number;
  monthlyActive: number;
  timestamp: string;
  trends: ActiveUserTrends;
}

export function useActiveUsers() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<ActiveUserMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  const fetchData = async () => {
    // Don't fetch if not admin
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/active-users");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch metrics");
      }
      const jsonData = await response.json();
      setData(jsonData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) {
      return;
    }

    // Only fetch if user is admin
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    fetchData();

    // Auto-refresh every 60 seconds (only for admins)
    const interval = setInterval(fetchData, 60 * 1000);

    return () => clearInterval(interval);
  }, [isAdmin, authLoading]);

  return { data, isLoading, error, isAdmin, refetch: fetchData };
}
