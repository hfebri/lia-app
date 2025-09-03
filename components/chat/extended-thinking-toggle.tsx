"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Brain, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtendedThinkingToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ExtendedThinkingToggle({
  enabled,
  onToggle,
  disabled = false,
  className,
}: ExtendedThinkingToggleProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center space-x-1">
        {enabled ? (
          <Lightbulb className="h-4 w-4 text-amber-500" />
        ) : (
          <Brain className="h-4 w-4 text-muted-foreground" />
        )}
        <Label
          htmlFor="extended-thinking"
          className={cn(
            "text-sm cursor-pointer transition-colors",
            enabled
              ? "text-amber-700 dark:text-amber-400"
              : "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          Extended Thinking
        </Label>
      </div>

      <Switch
        id="extended-thinking"
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="data-[state=checked]:bg-amber-500"
      />
    </div>
  );
}
