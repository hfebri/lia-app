"use client";

import { Message } from "@/lib/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User, Bot, Clock } from "lucide-react";

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageItem({
  message,
  isStreaming = false,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const formatTime = (timestamp: Date) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Invalid time";
      }
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch (error) {
      console.error("Time formatting error in message-item:", error, timestamp);
      return "Unknown";
    }
  };

  return (
    <div
      className={cn("flex gap-3 p-4", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
              : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
        {isUser && <AvatarImage src="/placeholder-user.jpg" alt="User" />}
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message Bubble */}
        <Card
          className={cn(
            "relative",
            isUser
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-muted border-border",
            isStreaming && "animate-pulse"
          )}
        >
          <CardContent className="p-3">
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Metadata */}
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(message.timestamp)}</span>
          </div>

          {message.metadata?.model && (
            <Badge variant="outline" className="text-xs">
              {message.metadata.model}
            </Badge>
          )}

          {message.metadata?.tokens && (
            <Badge variant="outline" className="text-xs">
              {message.metadata.tokens} tokens
            </Badge>
          )}

          {isStreaming && (
            <Badge variant="outline" className="text-xs animate-pulse">
              Typing...
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
