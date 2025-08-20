"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Paperclip,
  MoreVertical,
  ArrowDown,
  Mic,
  Image,
  File,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
  }>;
}

interface MobileChatProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string, attachments?: File[]) => void;
  className?: string;
}

export function MobileChat({
  messages,
  isLoading,
  onSendMessage,
  className,
}: MobileChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle scroll detection for scroll-to-bottom button
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    scrollArea.addEventListener("scroll", handleScroll);
    return () => scrollArea.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSend = () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    onSendMessage(inputValue, attachments);
    setInputValue("");
    setAttachments([]);
    setShowAttachments(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    setAttachments((prev) => [...prev, ...newFiles]);
    setShowAttachments(true);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    if (attachments.length === 1) {
      setShowAttachments(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>

                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center space-x-2 p-2 bg-background/10 rounded text-xs"
                      >
                        <File className="h-3 w-3" />
                        <span className="truncate">{attachment.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-150" />
                  </div>
                  <span className="ml-2">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-20 right-4 rounded-full shadow-lg z-10"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      {/* Attachments Preview */}
      {showAttachments && attachments.length > 0 && (
        <div className="border-t bg-muted/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Attachments ({attachments.length})
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAttachments(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-background rounded text-sm"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(file.size / 1024).toFixed(1)}KB
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              {/* Attachment Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="outline" className="shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-64">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Add Attachment
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Button
                        variant="outline"
                        className="h-20 flex-col space-y-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <File className="h-6 w-6" />
                        <span className="text-xs">File</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex-col space-y-2"
                        disabled
                      >
                        <Image className="h-6 w-6" />
                        <span className="text-xs">Image</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex-col space-y-2"
                        disabled
                      >
                        <Mic className="h-6 w-6" />
                        <span className="text-xs">Voice</span>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Text Input */}
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 min-h-[40px] resize-none"
                disabled={isLoading}
              />

              {/* Send Button */}
              <Button
                size="icon"
                onClick={handleSend}
                disabled={
                  isLoading || (!inputValue.trim() && attachments.length === 0)
                }
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-1 overflow-x-auto pb-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap"
                onClick={() => setInputValue("Analyze this document")}
              >
                📄 Analyze
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap"
                onClick={() => setInputValue("Summarize the key points")}
              >
                📝 Summarize
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap"
                onClick={() => setInputValue("Explain this concept")}
              >
                💡 Explain
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        accept=".pdf,.doc,.docx,.txt,.csv,.json"
      />
    </div>
  );
}
