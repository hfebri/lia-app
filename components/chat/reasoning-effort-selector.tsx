"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

interface ReasoningEffortSelectorProps {
  value: ReasoningEffort;
  onValueChange: (value: ReasoningEffort) => void;
  disabled?: boolean;
  className?: string;
}

const reasoningEffortOptions: Array<{
  value: ReasoningEffort;
  label: string;
  description: string;
  color: string;
}> = [
  {
    value: "minimal",
    label: "Minimal",
    description: "Quick responses, basic reasoning",
    color: "text-gray-600",
  },
  {
    value: "low",
    label: "Low",
    description: "Faster responses with light reasoning",
    color: "text-blue-600",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Balanced reasoning and response time",
    color: "text-yellow-600",
  },
  {
    value: "high",
    label: "High",
    description: "Deep reasoning, more thoughtful responses",
    color: "text-orange-600",
  },
];

export function ReasoningEffortSelector({
  value,
  onValueChange,
  disabled = false,
  className,
}: ReasoningEffortSelectorProps) {
  const currentOption = reasoningEffortOptions.find(
    (option) => option.value === value
  );

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center space-x-1">
        <Brain className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm text-muted-foreground">Reasoning:</Label>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8 px-3 font-normal justify-between min-w-[120px]"
          >
            <span className={cn("capitalize", currentOption?.color)}>
              {currentOption?.label || "Medium"}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[240px]">
          {reasoningEffortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onValueChange(option.value)}
              className="cursor-pointer"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium capitalize", option.color)}>
                    {option.label}
                  </span>
                  {value === option.value && (
                    <div className="h-2 w-2 rounded-full bg-current" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
