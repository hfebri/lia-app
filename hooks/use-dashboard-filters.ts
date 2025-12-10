"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "dashboard-filters";
const RESET_TIMESTAMP_KEY = "dashboard-filters-reset-timestamp";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DashboardFilters {
  dateRange: DateRange | null;
  selectedUserId: string | null;
}

interface UseDashboardFiltersReturn {
  filters: DashboardFilters;
  setDateRange: (range: DateRange | null) => void;
  setSelectedUserId: (userId: string | null) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

function getDefault30DaysRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return { from, to };
}

function getDefaultFilters(): DashboardFilters {
  return {
    dateRange: null,
    selectedUserId: null,
  };
}

function shouldResetFilters(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const lastReset = localStorage.getItem(RESET_TIMESTAMP_KEY);
    if (!lastReset) {
      // First time, set reset timestamp to next 1 AM
      const nextReset = getNext1AM();
      localStorage.setItem(RESET_TIMESTAMP_KEY, nextReset.toISOString());
      return false;
    }

    const lastResetDate = new Date(lastReset);
    const now = new Date();

    // If current time is past the reset time, clear filters
    if (now >= lastResetDate) {
      // Set next reset time
      const nextReset = getNext1AM();
      localStorage.setItem(RESET_TIMESTAMP_KEY, nextReset.toISOString());
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

function getNext1AM(): Date {
  const now = new Date();
  const next1AM = new Date(now);
  next1AM.setHours(1, 0, 0, 0);

  // If 1 AM has already passed today, set to tomorrow's 1 AM
  if (now >= next1AM) {
    next1AM.setDate(next1AM.getDate() + 1);
  }

  return next1AM;
}

function loadFiltersFromStorage(): DashboardFilters {
  if (typeof window === "undefined") return getDefaultFilters();

  try {
    // Check if filters should be reset
    if (shouldResetFilters()) {
      localStorage.removeItem(STORAGE_KEY);
      return getDefaultFilters();
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultFilters();

    const parsed = JSON.parse(stored);

    // Parse date strings back to Date objects
    if (parsed.dateRange) {
      return {
        dateRange: {
          from: new Date(parsed.dateRange.from),
          to: new Date(parsed.dateRange.to),
        },
        selectedUserId: parsed.selectedUserId || null,
      };
    }

    return {
      dateRange: null,
      selectedUserId: parsed.selectedUserId || null,
    };
  } catch (error) {
    return getDefaultFilters();
  }
}

function saveFiltersToStorage(filters: DashboardFilters): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    // Storage quota exceeded or disabled
    console.warn("Failed to save dashboard filters to localStorage:", error);
  }
}

export function useDashboardFilters(): UseDashboardFiltersReturn {
  const [filters, setFilters] = useState<DashboardFilters>(() =>
    loadFiltersFromStorage()
  );

  // Check for reset on mount and set up interval
  useEffect(() => {
    // Initial check
    if (shouldResetFilters()) {
      setFilters(getDefaultFilters());
    }

    // Check every minute for reset time
    const interval = setInterval(() => {
      if (shouldResetFilters()) {
        setFilters(getDefaultFilters());
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Save to localStorage whenever filters change
  useEffect(() => {
    saveFiltersToStorage(filters);
  }, [filters]);

  const setDateRange = useCallback((range: DateRange | null) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: range,
    }));
  }, []);

  const setSelectedUserId = useCallback((userId: string | null) => {
    setFilters((prev) => ({
      ...prev,
      selectedUserId: userId,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  const hasActiveFilters =
    filters.dateRange !== null || filters.selectedUserId !== null;

  return {
    filters,
    setDateRange,
    setSelectedUserId,
    resetFilters,
    hasActiveFilters,
  };
}
