"use client";

import { Button } from "@/components/ui/button";
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
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

interface ModelUsageFiltersProps {
  filters: {
    startDate: Date;
    endDate: Date;
    userId?: string;
    modelId?: string;
  };
  onFilterChange: (filters: any) => void;
  availableUsers: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  availableModels: Array<{
    id: string;
    name: string;
    provider: string;
  }>;
}

export function ModelUsageFilters({
  filters,
  onFilterChange,
  availableUsers,
  availableModels,
}: ModelUsageFiltersProps) {
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
    <div className="flex flex-wrap items-center gap-4 mb-6">
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
            onSelect={(date) => date && onFilterChange({ startDate: date })}
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
            onSelect={(date) => date && onFilterChange({ endDate: date })}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* User Filter */}
      <Select
        value={filters.userId || "all"}
        onValueChange={(value) =>
          onFilterChange({ userId: value === "all" ? undefined : value })
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
          onFilterChange({ modelId: value === "all" ? undefined : value })
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

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onFilterChange({ userId: undefined, modelId: undefined })
          }
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
