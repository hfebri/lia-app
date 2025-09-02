"use client";

import { Message } from "@/lib/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User, Bot, Clock, FileText, Image, File } from "lucide-react";

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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <Image className="h-3 w-3" />;
    }
    if (fileType === "application/pdf") {
      return <FileText className="h-3 w-3" />;
    }
    return <File className="h-3 w-3" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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
      return "Unknown";
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 p-4 group hover:bg-muted/30 transition-colors duration-200",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background shadow-sm">
        <AvatarFallback
          className={cn(
            "font-medium transition-colors",
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
        {isUser && <AvatarImage src="/placeholder-user.jpg" alt="User" />}
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[75%] min-w-0",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md",
            "before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-inset before:ring-white/10",
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md"
              : "bg-background border border-border/60 text-foreground rounded-bl-md",
            isStreaming && "animate-pulse"
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

          <div className="relative text-sm leading-relaxed whitespace-pre-wrap break-words">
            {/* File attachments - show above content for user messages */}
            {isUser && message.files && message.files.length > 0 && (
              <div className="mb-3 space-y-2">
                {message.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20"
                  >
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">
                        {file.name}
                      </div>
                      <div className="text-xs opacity-75">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {message.content}

            {/* File attachments - show below content for assistant messages */}
            {isAssistant && message.files && message.files.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/40"
                  >
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
        </div>

        {/* Message Metadata */}
        <div
          className={cn(
            "flex items-center gap-2 mt-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTime(message.timestamp)}</span>
          </div>

          {message.metadata?.model && (
            <Badge
              variant="secondary"
              className="text-xs px-2 py-0.5 font-medium"
            >
              {message.metadata.model.split("/").pop()}
            </Badge>
          )}

          {message.metadata?.tokens && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {message.metadata.tokens}
            </Badge>
          )}

          {isStreaming && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                Typing
              </div>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
