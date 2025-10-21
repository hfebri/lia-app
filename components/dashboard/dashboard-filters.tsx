"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, User, X, Filter, Check } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import type { DateRange } from "@/hooks/use-dashboard-filters";

interface User {
  id: string;
  email: string;
  name: string;
}

type DatePreset = "this-week" | "this-month" | "custom" | "all";

interface DashboardFiltersProps {
  dateRange: DateRange | null;
  selectedUserId: string | null;
  onDateRangeChange: (range: DateRange | null) => void;
  onUserIdChange: (userId: string | null) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  isAdmin: boolean;
}

function getDateRangeForPreset(preset: DatePreset): DateRange | null {
  const now = new Date();

  switch (preset) {
    case "this-week":
      return {
        from: startOfWeek(now, { weekStartsOn: 0 }),
        to: endOfWeek(now, { weekStartsOn: 0 }),
      };
    case "this-month":
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
    case "all":
      return null;
    default:
      return null;
  }
}

export function DashboardFilters({
  dateRange,
  selectedUserId,
  onDateRangeChange,
  onUserIdChange,
  onReset,
  hasActiveFilters,
  isAdmin,
}: DashboardFiltersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Pending state (before confirm)
  const [pendingDatePreset, setPendingDatePreset] = useState<DatePreset>("all");
  const [pendingCustomRange, setPendingCustomRange] = useState<DateRange | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Initialize pending state from current filters
  useEffect(() => {
    setPendingUserId(selectedUserId);
  }, [selectedUserId]);

  // Fetch users list for admin
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await fetch("/api/users/list");
        const result = await response.json();

        if (result.success) {
          setUsers(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isAdmin]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setPendingDatePreset(preset);
    if (preset !== "custom") {
      setPendingCustomRange(null);
      setCalendarOpen(false);
    }
  };

  const handleCustomDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setPendingCustomRange({
        from: range.from,
        to: range.to,
      });
      // Don't close calendar - let user click outside to close
    }
  };

  const handleApplyFilters = () => {
    // Apply date filter
    if (pendingDatePreset === "custom" && pendingCustomRange) {
      onDateRangeChange(pendingCustomRange);
    } else {
      const presetRange = getDateRangeForPreset(pendingDatePreset);
      onDateRangeChange(presetRange);
    }

    // Apply user filter
    onUserIdChange(pendingUserId);
  };

  const handleResetFilters = () => {
    setPendingDatePreset("all");
    setPendingCustomRange(null);
    setPendingUserId(null);
    onReset();
  };

  const hasPendingChanges = () => {
    // Check if date filter changed
    const pendingDateRange = pendingDatePreset === "custom"
      ? pendingCustomRange
      : getDateRangeForPreset(pendingDatePreset);

    const dateChanged = JSON.stringify(dateRange) !== JSON.stringify(pendingDateRange);
    const userChanged = selectedUserId !== pendingUserId;

    return dateChanged || userChanged;
  };

  return (
    <Card className="p-4 mb-6 border-0 shadow-sm">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Filters</h3>
            {hasActiveFilters && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Preset Selector */}
          <div className="flex-1">
            <div className="flex gap-2">
              <Select
                value={pendingDatePreset}
                onValueChange={(value) => handleDatePresetChange(value as DatePreset)}
              >
                <SelectTrigger className="flex-1">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select date range" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range Picker - Only shown when custom is selected */}
              {pendingDatePreset === "custom" && (
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !pendingCustomRange && "text-muted-foreground"
                      )}
                    >
                      {pendingCustomRange ? (
                        <>
                          {format(pendingCustomRange.from, "MMM d")} -{" "}
                          {format(pendingCustomRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        <span>Pick dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={
                        pendingCustomRange
                          ? { from: pendingCustomRange.from, to: pendingCustomRange.to }
                          : undefined
                      }
                      onSelect={handleCustomDateSelect}
                      numberOfMonths={2}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* User Selector (Admin Only) */}
          {isAdmin && (
            <div className="flex-1">
              <Select
                value={pendingUserId || "all"}
                onValueChange={(value) =>
                  setPendingUserId(value === "all" ? null : value)
                }
                disabled={isLoadingUsers}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All users" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Apply Filters Button */}
          <Button
            onClick={handleApplyFilters}
            disabled={!hasPendingChanges()}
            className="sm:w-auto"
          >
            <Check className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {dateRange && (
              <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded">
                <CalendarIcon className="h-3 w-3" />
                <span>
                  {format(dateRange.from, "MMM d")} -{" "}
                  {format(dateRange.to, "MMM d, yyyy")}
                </span>
              </div>
            )}
            {selectedUserId && (
              <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded">
                <User className="h-3 w-3" />
                <span>
                  {users.find((u) => u.id === selectedUserId)?.name ||
                    "Selected user"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
