"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Brain,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelHelpDialog } from "./model-help-dialog";

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

const getProviderLogo = (provider: string) => {
  if (provider === "openai") {
    return "/logo/openai.svg";
  }
  if (provider === "anthropic") {
    return "/logo/claude.svg";
  }
  return null;
};

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const currentModel = models.find((m) => m.id === selectedModel);

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
            {getProviderLogo(currentModel.provider) ? (
              <Image
                src={getProviderLogo(currentModel.provider)!}
                alt={currentModel.provider}
                width={16}
                height={16}
                className={cn(
                  "shrink-0",
                  currentModel.provider === "openai" && "dark:invert"
                )}
              />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            <span className="text-sm font-medium truncate">
              {currentModel.name}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[600px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Select AI Model</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setHelpOpen(true);
            }}
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Two-column layout grouped by provider */}
        <div className="grid grid-cols-2 gap-4 p-3">
          {/* OpenAI Column */}
          <div className="space-y-2">
            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Image
                src="/logo/openai.svg"
                alt="OpenAI"
                width={20}
                height={20}
                className="dark:invert"
              />
              OpenAI
            </div>
            {models
              .filter((model) => model.provider === "openai")
              .map((model) => {
                const isSelected = model.id === selectedModel;
                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                      isSelected && "bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{model.name}</span>
                      {isSelected && (
                        <div className="h-2 w-2 bg-primary rounded-full" />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Anthropic Column */}
          <div className="space-y-2">
            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Image
                src="/logo/claude.svg"
                alt="Anthropic"
                width={20}
                height={20}
              />
              Anthropic
            </div>
            {models
              .filter((model) => model.provider === "anthropic")
              .map((model) => {
                const isSelected = model.id === selectedModel;
                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                      isSelected && "bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{model.name}</span>
                      {isSelected && (
                        <div className="h-2 w-2 bg-primary rounded-full" />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <DropdownMenuSeparator />
        <div className="p-2 text-xs text-muted-foreground">
          Select the AI model that best fits your needs. More powerful models
          may take longer to respond.
        </div>
      </DropdownMenuContent>

      <ModelHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </DropdownMenu>
  );
}
