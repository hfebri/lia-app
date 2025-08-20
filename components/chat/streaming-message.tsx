"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, Square, Bot, Sparkles, Brain, Zap } from "lucide-react";

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  model?: string;
  onStop?: () => void;
  className?: string;
}

const getModelIcon = (modelId?: string) => {
  if (!modelId) return <Bot className="h-4 w-4" />;
  if (modelId.includes("gpt-5"))
    return <Sparkles className="h-4 w-4 text-purple-500" />;
  if (modelId.includes("gpt-4"))
    return <Brain className="h-4 w-4 text-blue-500" />;
  return <Zap className="h-4 w-4 text-green-500" />;
};

const getModelName = (modelId?: string) => {
  if (!modelId) return "AI Assistant";
  if (modelId.includes("gpt-5")) return "GPT-5";
  if (modelId.includes("gpt-4")) return "GPT-4";
  if (modelId.includes("gpt-3.5")) return "GPT-3.5";
  return modelId.split("/").pop() || "AI Assistant";
};

export function StreamingMessage({
  content,
  isStreaming,
  model,
  onStop,
  className,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Typing animation effect
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 10); // Adjust speed as needed

      return () => clearTimeout(timer);
    }
  }, [content, currentIndex, isStreaming]);

  // Reset when content changes significantly
  useEffect(() => {
    if (content.length < displayedContent.length) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  }, [content, displayedContent.length]);

  return (
    <div className={cn("flex space-x-3 group", className)}>
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
          {getModelIcon(model)}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {/* Header */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">{getModelName(model)}</span>
          {isStreaming && (
            <Badge variant="secondary" className="text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Generating...
            </Badge>
          )}
          {!isStreaming && content && (
            <Badge variant="outline" className="text-xs">
              Complete
            </Badge>
          )}
        </div>

        {/* Message Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap break-words">
            {displayedContent}
            {isStreaming && (
              <span className="inline-block w-2 h-5 bg-current animate-pulse ml-1" />
            )}
          </div>
        </div>

        {/* Actions */}
        {isStreaming && onStop && (
          <div className="flex items-center space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="h-7 px-2 text-xs"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
