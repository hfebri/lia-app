"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
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
  if (modelId.includes("gpt-5-pro"))
    return <Sparkles className="h-4 w-4 text-purple-600" />;
  if (modelId.includes("gpt-5"))
    return <Sparkles className="h-4 w-4 text-purple-500" />;
  if (modelId.includes("gpt-4"))
    return <Brain className="h-4 w-4 text-blue-500" />;
  if (modelId.includes("gemini"))
    return <Sparkles className="h-4 w-4 text-orange-500" />;
  return <Zap className="h-4 w-4 text-green-500" />;
};

const getModelName = (modelId?: string) => {
  if (!modelId) return "AI Assistant";
  if (modelId.includes("gpt-5-pro")) return "GPT-5 Pro";
  if (modelId.includes("gpt-5")) return "GPT-5";
  if (modelId.includes("gpt-4")) return "GPT-4";
  if (modelId.includes("gpt-3.5")) return "GPT-3.5";
  if (modelId.includes("gemini-2.5-flash-lite")) return "Gemini 2.5 Flash Lite";
  if (modelId.includes("gemini-2.5-flash")) return "Gemini 2.5 Flash";
  if (modelId.includes("gemini")) return "Gemini";
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
  const [animationStartTime] = useState(Date.now());

  // Maximum duration for typing animation (in milliseconds)
  // After this time, just display all content to prevent lag
  const MAX_TYPING_DURATION = 5000; // 5 seconds

  // Typing animation effect
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    // Check if we've exceeded max typing duration
    const elapsedTime = Date.now() - animationStartTime;
    if (elapsedTime > MAX_TYPING_DURATION) {
      // Just display everything immediately
      setDisplayedContent(content);
      setCurrentIndex(content.length);
      return;
    }

    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 10); // Adjust speed as needed

      return () => clearTimeout(timer);
    }
  }, [content, currentIndex, isStreaming, animationStartTime]);

  // Reset when content changes significantly
  useEffect(() => {
    if (content.length < displayedContent.length) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  }, [content, displayedContent.length]);

  return (
    <div
      className={cn(
        "flex gap-3 p-4 group hover:bg-muted/30 transition-colors duration-200",
        className
      )}
    >
      {/* AI Avatar */}
      <div className="h-8 w-8 shrink-0 ring-2 ring-background shadow-sm rounded-full overflow-hidden">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          {getModelIcon(model)}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex flex-col gap-1 max-w-[75%] min-w-0 items-start">
        {/* Message Bubble */}
        <div className="relative rounded-2xl rounded-bl-md px-4 py-3 bg-background border border-border/60 text-foreground shadow-sm transition-all duration-200 hover:shadow-md">
          {/* Message tail */}
          <div className="absolute top-4 -left-1 w-3 h-3 transform rotate-45 bg-background border-l border-b border-border/60" />

          <div className="relative text-sm leading-relaxed break-words">
            <Markdown content={displayedContent} />
            {isStreaming && (
              <span className="inline-flex items-center ml-2">
                <span className="w-1 h-1 bg-current rounded-full animate-pulse" />
                <span
                  className="w-1 h-1 bg-current rounded-full animate-pulse ml-1"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="w-1 h-1 bg-current rounded-full animate-pulse ml-1"
                  style={{ animationDelay: "0.4s" }}
                />
              </span>
            )}
          </div>

          {/* Actions inline with message when streaming */}
          {isStreaming && onStop && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                className="h-7 px-3 text-xs hover:bg-muted/60"
              >
                <Square className="h-3 w-3 mr-1" />
                Stop generating
              </Button>
            </div>
          )}
        </div>

        {/* Message Metadata */}
        <div className="flex items-center gap-2 mt-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {getModelIcon(model)}
            <span>{getModelName(model)}</span>
          </div>

          {isStreaming && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                Generating
              </div>
            </Badge>
          )}

          {!isStreaming && content && (
            <Badge variant="outline" className="text-xs">
              Complete
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
