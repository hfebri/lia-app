"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageSkeletonProps {
  isUser?: boolean;
  className?: string;
}

export function MessageSkeleton({
  isUser = false,
  className,
}: MessageSkeletonProps) {
  return (
    <div
      className={cn(
        "flex gap-3 p-4 animate-pulse",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div className="h-8 w-8 shrink-0 ring-2 ring-background shadow-sm rounded-full">
        <div
          className={cn(
            "w-full h-full rounded-full flex items-center justify-center",
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600"
          )}
        >
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-1 min-w-0",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-3 shadow-sm",
            "before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-inset before:ring-white/10",
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 rounded-br-md"
              : "bg-background border border-border/60 rounded-bl-md"
          )}
        >
          {/* Message tail */}
          <div
            className={cn(
              "absolute top-4 w-3 h-3 transform rotate-45",
              isUser
                ? "-right-1 bg-gradient-to-br from-blue-500 to-blue-600"
                : "-left-1 bg-background border-l border-b border-border/60"
            )}
          />

          <div className="relative space-y-2">
            <Skeleton
              className={cn("h-4 w-48", isUser ? "bg-white/20" : "bg-muted")}
            />
            <Skeleton
              className={cn("h-4 w-32", isUser ? "bg-white/20" : "bg-muted")}
            />
            <Skeleton
              className={cn("h-4 w-40", isUser ? "bg-white/20" : "bg-muted")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatHistorySkeleton({
  messageCount = 3,
}: {
  messageCount?: number;
}) {
  return (
    <div className="space-y-6 mx-auto">
      {Array.from({ length: messageCount }).map((_, index) => (
        <div key={index}>
          {/* User message */}
          <MessageSkeleton isUser />
          {/* Assistant message */}
          <MessageSkeleton />
        </div>
      ))}
    </div>
  );
}
