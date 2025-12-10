"use client";

import { useEffect, useRef, useState } from "react";
import { Message } from "@/lib/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/components/providers/toast-provider";
import {
  User,
  Bot,
  Clock,
  FileText,
  Image,
  File,
  FileSpreadsheet,
  FileImage,
  FileCode,
  Copy,
  Check,
} from "lucide-react";

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onContinue?: () => void;
}

export function MessageItem({
  message,
  isStreaming = false,
  onContinue,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const getFileIcon = (fileType: string, fileName?: string) => {
    // Image files
    if (fileType.startsWith("image/")) {
      return <FileImage className="h-4 w-4 text-blue-500" />;
    }
    
    // PDF files
    if (fileType === "application/pdf") {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    
    // Microsoft Office files
    if (fileType.includes("spreadsheet") || fileType.includes("excel") || fileName?.endsWith('.xlsx') || fileName?.endsWith('.xls')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }
    
    // Word documents
    if (fileType.includes("wordprocessing") || fileType.includes("msword") || fileName?.endsWith('.docx') || fileName?.endsWith('.doc')) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    }
    
    // PowerPoint presentations
    if (fileType.includes("presentation") || fileType.includes("powerpoint") || fileName?.endsWith('.pptx') || fileName?.endsWith('.ppt')) {
      return <FileText className="h-4 w-4 text-orange-500" />;
    }
    
    // Code files
    if (fileName?.match(/\.(js|jsx|ts|tsx|py|html|css|json|xml|yml|yaml)$/)) {
      return <FileCode className="h-4 w-4 text-purple-500" />;
    }
    
    // Default file icon
    return <File className="h-4 w-4 text-gray-500" />;
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
        {/* AvatarImage removed - let fallback handle display */}
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

          <div className="relative text-sm leading-relaxed break-words">
            {isAssistant && message.content && message.content.trim().length > 0 && (
              <div className="absolute top-2 right-2 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full border border-border/60 bg-background/80 backdrop-blur pointer-events-auto"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(message.content);
                      toastSuccess("Copied to clipboard");
                      setIsCopied(true);
                      if (copyTimeoutRef.current) {
                        clearTimeout(copyTimeoutRef.current);
                      }
                      copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
                    } catch (error) {
                      console.error("Failed to copy assistant message:", error);
                      toastError("Copy failed", "Browser blocked clipboard access.");
                    }
                  }}
                  aria-label="Copy message"
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* File attachments - show above content for user messages */}
            {isUser && message.files && message.files.length > 0 && (
              <div className="mb-3 space-y-2">
                {message.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20"
                  >
                    {getFileIcon(file.type, file.name)}
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

            {isAssistant ? (
              <Markdown content={message.content} />
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}

            {/* File attachments - show below content for assistant messages */}
            {isAssistant && message.files && message.files.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/40"
                  >
                    {getFileIcon(file.type, file.name)}
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

            {/* Truncation Warning - Show for assistant messages only */}
            {isAssistant && message.metadata?.isTruncated && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700">
                  ⚠️ Response Truncated
                </Badge>
                <span className="text-xs text-yellow-700 dark:text-yellow-300 flex-1">
                  Response was cut off due to length limit
                  {message.metadata.stopReason && message.metadata.stopReason !== "max_tokens" && ` (${message.metadata.stopReason})`}
                </span>
                {onContinue && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onContinue}
                    className="ml-auto h-7 text-xs border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                  >
                    Continue
                  </Button>
                )}
              </div>
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
