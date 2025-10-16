"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Bot,
  Sparkles,
  Brain,
  Zap,
  MoreVertical,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AIResponseProps {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  timestamp?: Date;
  onRegenerate?: () => void;
  onCopy?: (content: string) => void;
  onFeedback?: (type: "positive" | "negative") => void;
  className?: string;
}

const getModelIcon = (modelId?: string) => {
  if (!modelId) return <Bot className="h-4 w-4" />;
  if (modelId.includes("gpt-5-pro"))
    return <Sparkles className="h-4 w-4 text-purple-600" />;
  if (modelId.includes("gpt-5"))
    return <Sparkles className="h-4 w-4 text-purple-500" />;
  if (modelId.includes("gpt-4"))
    return <Brain className="h-4 w-4 text-blue-500" />;
  return <Zap className="h-4 w-4 text-green-500" />;
};

const getModelName = (modelId?: string) => {
  if (!modelId) return "AI Assistant";
  if (modelId.includes("gpt-5-pro")) return "GPT-5 Pro";
  if (modelId.includes("gpt-5")) return "GPT-5";
  if (modelId.includes("gpt-4")) return "GPT-4";
  if (modelId.includes("gpt-3.5")) return "GPT-3.5";
  return modelId.split("/").pop() || "AI Assistant";
};

const formatTimestamp = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export function AIResponse({
  content,
  model,
  usage,
  timestamp,
  onRegenerate,
  onCopy,
  onFeedback,
  className,
}: AIResponseProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(
    null
  );

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(content);
    } else {
      await navigator.clipboard.writeText(content);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedback(type);
    onFeedback?.(type);
  };

  return (
    <div className={cn("flex space-x-3 group", className)}>
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
          {getModelIcon(model)}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{getModelName(model)}</span>
            {timestamp && (
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(timestamp)}
              </span>
            )}
          </div>

          {/* Actions Menu */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy response
                </DropdownMenuItem>
                {onRegenerate && (
                  <DropdownMenuItem onClick={onRegenerate}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Regenerate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Message Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap break-words">{content}</div>
        </div>

        {/* Footer with Actions and Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>

            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            )}

            <Separator orientation="vertical" className="h-4" />

            {/* Feedback Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback("positive")}
              className={cn(
                "h-7 px-2 text-xs",
                feedback === "positive" &&
                  "text-green-600 bg-green-50 dark:bg-green-950"
              )}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback("negative")}
              className={cn(
                "h-7 px-2 text-xs",
                feedback === "negative" &&
                  "text-red-600 bg-red-50 dark:bg-red-950"
              )}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Usage Stats */}
          {usage && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {usage.total_tokens} tokens
              </Badge>
              <span>•</span>
              <span>
                {usage.prompt_tokens} in, {usage.completion_tokens} out
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
