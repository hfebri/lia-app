"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/types/chat";
import { MessageItem } from "./message-item";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isStreaming?: boolean;
  streamingMessageId?: string;
}

export function MessageList({
  messages,
  isLoading = false,
  isStreaming = false,
  streamingMessageId,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
            <p className="text-sm text-muted-foreground">
              Send a message to begin your conversation with AI. You can ask
              questions, get help with tasks, or just chat!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 h-full">
      <div className="space-y-0">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isStreaming={isStreaming && message.id === streamingMessageId}
          />
        ))}

        {isLoading && (
          <div className="flex gap-3 p-4">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <Card className="bg-muted border-border">
              <CardContent className="p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invisible element to scroll to */}
        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  );
}
