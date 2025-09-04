"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
  selectedModel?: string;
}

export function ThinkingModeToggle({
  enabled,
  onToggle,
  disabled = false,
  className,
  selectedModel,
}: ThinkingModeToggleProps) {
  // Hide for non-Gemini models
  const isGeminiModel = selectedModel?.includes("gemini");
  if (!isGeminiModel) return null;

  // Always enabled for Gemini 2.5 Pro
  const isGemini25Pro = selectedModel === "gemini-2.5-pro";
  const isForceEnabled = isGemini25Pro;
  const actuallyEnabled = isForceEnabled || enabled;
  const actuallyDisabled = disabled || isForceEnabled;

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center space-x-1">
        {actuallyEnabled ? (
          <Zap className="h-4 w-4 text-blue-500" />
        ) : (
          <Brain className="h-4 w-4 text-muted-foreground" />
        )}
        <Label
          htmlFor="thinking-mode"
          className={cn(
            "text-sm cursor-pointer transition-colors",
            actuallyEnabled
              ? "text-blue-700 dark:text-blue-400"
              : "text-muted-foreground",
            actuallyDisabled && "cursor-not-allowed opacity-50"
          )}
        >
          Thinking Mode
        </Label>
      </div>

      <Switch
        id="thinking-mode"
        checked={actuallyEnabled}
        onCheckedChange={onToggle}
        disabled={actuallyDisabled}
        className="data-[state=checked]:bg-blue-500"
      />
    </div>
  );
}
