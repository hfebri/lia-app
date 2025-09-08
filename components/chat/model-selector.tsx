"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  ChevronDown,
  Zap,
  Clock,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  contextWindow: number;
  isDefault: boolean;
  capabilities: string[];
  pricing: {
    input: number;
    output: number;
    unit: string;
  };
}

interface ModelSelectorProps {
  models: Model[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

const getModelIcon = (modelId: string) => {
  if (modelId.includes("gpt-5")) return <Sparkles className="h-4 w-4" />;
  if (modelId.includes("claude")) return <Brain className="h-4 w-4" />;
  if (modelId.includes("deepseek")) return <Zap className="h-4 w-4" />;
  return <Brain className="h-4 w-4" />;
};

const getModelSpeed = (modelId: string) => {
  if (modelId.includes("gpt-5-nano")) return "Fastest";
  if (modelId.includes("gpt-5-mini")) return "Fast";
  if (modelId.includes("gpt-5")) return "Smart";
  if (modelId.includes("claude-4")) return "Hybrid";
  if (modelId.includes("deepseek-r1")) return "Reasoning";
  return "Medium";
};

const getSpeedColor = (speed: string) => {
  switch (speed) {
    case "Fastest":
      return "text-emerald-600";
    case "Fast":
      return "text-green-600";
    case "Medium":
      return "text-yellow-600";
    case "Smart":
      return "text-purple-600";
    case "Hybrid":
      return "text-blue-600";
    case "Reasoning":
      return "text-indigo-600";
    default:
      return "text-gray-600";
  }
};

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const currentModel = models.find((m) => m.id === selectedModel);
  const speed = currentModel ? getModelSpeed(currentModel.id) : "Medium";

  if (!currentModel) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Brain className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No model selected</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "flex items-center space-x-2 min-w-[140px] justify-between",
            className
          )}
        >
          <div className="flex items-center space-x-2">
            {getModelIcon(currentModel.id)}
            <span className="text-sm font-medium truncate">
              {currentModel.name}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center space-x-2">
          <Brain className="h-4 w-4" />
          <span>Select AI Model</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {models.map((model) => {
          const isSelected = model.id === selectedModel;
          const modelSpeed = getModelSpeed(model.id);

          return (
            <DropdownMenuItem
              key={model.id}
              onClick={() => {
                onModelChange(model.id);
                setOpen(false);
              }}
              className={cn(
                "flex flex-col items-start space-y-2 p-3 cursor-pointer",
                isSelected && "bg-accent"
              )}
            >
              {/* Model Header */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  {getModelIcon(model.id)}
                  <span className="font-medium">{model.name}</span>
                  {model.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                {isSelected && (
                  <div className="h-2 w-2 bg-primary rounded-full" />
                )}
              </div>

              {/* Model Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {model.description}
              </p>

              {/* Model Stats */}
              <div className="flex items-center space-x-4 w-full text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span className={getSpeedColor(modelSpeed)}>
                    {modelSpeed}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3" />
                  <span>
                    ${model.pricing.input.toFixed(3)}/{model.pricing.unit}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>
                    {(model.contextWindow / 1000).toFixed(0)}K context
                  </span>
                </div>
              </div>

              {/* Capabilities */}
              <div className="w-full">
                <div className="text-xs text-muted-foreground mb-1 font-medium">
                  Best for:
                </div>
                <div className="flex flex-wrap gap-1">
                  {model.capabilities.slice(0, 3).map((capability) => (
                    <Badge
                      key={capability}
                      variant="outline"
                      className="text-xs px-1.5 py-0.5"
                    >
                      {capability.replace("-", " ")}
                    </Badge>
                  ))}
                  {model.capabilities.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      +{model.capabilities.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <div className="p-2 text-xs text-muted-foreground">
          Select the AI model that best fits your needs. More powerful models
          may take longer to respond.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
