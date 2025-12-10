"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebSearchToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function WebSearchToggle({
  enabled,
  onToggle,
  disabled = false,
  className,
}: WebSearchToggleProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center space-x-1">
        {enabled ? (
          <Search className="h-4 w-4 text-blue-500" />
        ) : (
          <Globe className="h-4 w-4 text-muted-foreground" />
        )}
        <Label
          htmlFor="web-search"
          className={cn(
            "text-sm cursor-pointer transition-colors",
            enabled
              ? "text-blue-700 dark:text-blue-400"
              : "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          Web Search
        </Label>
      </div>

      <Switch
        id="web-search"
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="data-[state=checked]:bg-blue-500"
      />
    </div>
  );
}
