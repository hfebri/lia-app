"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAiChat } from "@/hooks/use-ai-chat";
import { uploadMultipleFilesStorageAction } from "@/actions/storage/file-storage-actions";
import { ModelSelector } from "./model-selector";
import { StreamingMessage } from "./streaming-message";
import { AIResponse } from "./ai-response";
import { MessageItem } from "./message-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Send,
  Square,
  MessageCircle,
  AlertCircle,
  Loader2,
  Paperclip,
  X,
  Image,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AiChatInterfaceProps {
  className?: string;
}

export function AiChatInterface({ className }: AiChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Ref for the scrollable messages container
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Ref for the input field to enable auto-focus
  const inputRef = useRef<HTMLInputElement>(null);

  // Function to scroll to bottom smoothly
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // Function to focus the input field
  const focusInput = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100); // Small delay to ensure DOM updates
  }, []);

  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    selectedModel,
    availableModels,
    sendMessage,
    stopStreaming,
    changeModel,

    clearError,
    loadModels,
    hasMessages,
    canSend,
    currentModel,
  } = useAiChat();

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Auto-scroll to bottom when messages change (new message or AI response)
  useEffect(() => {
    if (messages.length > 0) {
      // Use setTimeout to ensure DOM is updated first
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages, scrollToBottom]);

  // Auto-scroll to bottom when streaming content updates
  useEffect(() => {
    if (isStreaming && streamingContent) {
      // Use a shorter timeout for streaming updates for smoother experience
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
  }, [isStreaming, streamingContent, scrollToBottom]);

  // Auto-scroll to bottom when component mounts (page load)
  useEffect(() => {
    // Use a longer timeout for initial load to ensure everything is rendered
    const timer = setTimeout(() => {
      scrollToBottom();
      focusInput(); // Also focus the input on page load
    }, 200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleSendMessage = async () => {
    if (
      (!inputValue.trim() && attachedFiles.length === 0) ||
      !canSend ||
      isUploadingFiles
    )
      return;

    const messageContent = inputValue.trim();
    setInputValue("");

    try {
      if (attachedFiles.length > 0) {
        setIsUploadingFiles(true);

        // Upload files to Supabase first
        const uploadResult = await uploadMultipleFilesStorageAction(
          attachedFiles,
          {
            extractText: true,
            analyzeWithAI: false,
          }
        );

        if (!uploadResult.isSuccess) {
          // Still send the message without files
          await sendMessage(messageContent);
        } else {
          // Convert uploaded files to the format needed for AI
          const uploadedFiles = uploadResult.data!.successful.map(
            (fileData) => {
              const originalFile = attachedFiles.find(
                (f) => f.name === fileData.file?.originalName
              );
              return {
                name: fileData.file?.originalName || "",
                type: fileData.file?.mimeType || "",
                size: fileData.file?.size || 0,
                data: "", // We'll get the base64 data from the uploaded file
                url: fileData.file?.url || "",
                id: fileData.fileId || "",
              };
            }
          );

          // Read files as base64 for AI processing
          const filesWithData = await Promise.all(
            attachedFiles.map(async (file) => {
              const base64 = await fileToBase64(file);
              return {
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64,
              };
            })
          );

          // Send message with files
          await sendMessage(messageContent, filesWithData as unknown as File[]);
        }

        setAttachedFiles([]);
        setIsUploadingFiles(false);
      } else {
        await sendMessage(messageContent);
      }
    } catch (error) {
      setIsUploadingFiles(false);
    }

    // Focus the input field for the next message
    focusInput();
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime/type;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // For now, we'll only support one file at a time for simplicity
      setAttachedFiles([files[0]]);
    }
    // Reset the input
    e.target.value = "";
  };

  const handleFileRemove = (index: number) => {
    setAttachedFiles((files) => files.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return Image;
    }
    return FileText;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStopStreaming = () => {
    stopStreaming();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-4">
              <AlertCircle className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Something went wrong</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={clearError} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("h-screen flex flex-col", className)}>
      {/* Fixed Header with Model Selector */}
      <div className="flex-shrink-0 bg-background border-b">
        <Card className="border-x-0 border-t-0 border-b-0 rounded-none shadow-none">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">AI Chat</CardTitle>
                </div>
                {hasMessages && (
                  <Badge variant="secondary">{messages.length} messages</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Model Selector */}
                <ModelSelector
                  models={availableModels}
                  selectedModel={selectedModel}
                  onModelChange={changeModel}
                  disabled={isLoading || isStreaming}
                />
              </div>
            </div>

            {currentModel && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Model: {currentModel.name}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Provider: {currentModel.provider}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Max tokens: {currentModel.maxTokens}</span>
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Scrollable Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-auto">
        <div className="p-4">
          {!hasMessages && !isStreaming ? (
            /* Welcome State */
            <div className="flex items-center justify-center h-96">
              <div className="text-center max-w-md">
                <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask me anything! I&apos;m powered by{" "}
                  {currentModel?.name || "AI"} and ready to help.
                </p>
                {availableModels.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Choose your preferred model above to get started.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Messages List */
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div key={message.id}>
                  {message.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                        <AIResponse
                          content={message.content}
                          model={message.model}
                          usage={message.usage}
                          timestamp={message.timestamp}
                          onRegenerate={() => {
                            // TODO: Implement regenerate
                          }}
                          onCopy={() => {
                            navigator.clipboard.writeText(message.content);
                          }}
                          onFeedback={(feedback) => {
                            // TODO: Implement feedback
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming Message */}
              {isStreaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                    <StreamingMessage
                      content={streamingContent}
                      isStreaming={isStreaming}
                      model={selectedModel}
                      onStop={handleStopStreaming}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="flex-shrink-0 bg-background border-t">
        <div className="p-4">
          <div className="max-w-4xl mx-auto">
            {/* File Attachments Preview */}
            {attachedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => {
                  const IconComponent = getFileIcon(file);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm"
                    >
                      <IconComponent className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">
                        {file.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleFileRemove(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* File attachment button */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf,.txt,.doc,.docx,.md,.csv,.json,.xml,.html"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="file-input"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "shrink-0 transition-colors",
                    attachedFiles.length > 0 &&
                      "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                  )}
                  asChild
                >
                  <label htmlFor="file-input" className="cursor-pointer">
                    <Paperclip className="h-4 w-4" />
                  </label>
                </Button>
              </div>

              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    !hasMessages
                      ? "Ask me anything..."
                      : "Continue the conversation..."
                  }
                  disabled={isLoading || isStreaming}
                  className="pr-12"
                />

                {isLoading && !isStreaming && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {isStreaming ? (
                <Button
                  onClick={handleStopStreaming}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    (!inputValue.trim() && attachedFiles.length === 0) ||
                    !canSend ||
                    isUploadingFiles
                  }
                  size="icon"
                  className="shrink-0"
                >
                  {isUploadingFiles ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Model info */}
            {currentModel && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Using {currentModel.name}</span>
                <Separator orientation="vertical" className="h-3" />
                <span>
                  ${currentModel.pricing.input.toFixed(3)}/
                  {currentModel.pricing.unit}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
