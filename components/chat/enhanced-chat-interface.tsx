"use client";

import { useEffect, useState } from "react";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useFileUpload, type FileItem } from "@/hooks/use-file-upload";
import { ModelSelector } from "./model-selector";
import { StreamingMessage } from "./streaming-message";
import { AIResponse } from "./ai-response";
import { MessageItem } from "./message-item";
import { FileAttachment } from "./file-attachment";
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
  FileText,
  Upload,
  Paperclip,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// FileItem interface is now imported from the hook

interface EnhancedChatInterfaceProps {
  className?: string;
}

export function EnhancedChatInterface({
  className,
}: EnhancedChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Use real file upload hook
  const {
    files: uploadedFiles,
    isUploading,
    uploadFiles,
    analyzeFile,
    deleteFile,
    refreshFiles,
    error: fileError,
    clearError: clearFileError,
  } = useFileUpload();

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
    clearConversation,
    clearError,
    loadModels,
    hasMessages,
    canSend,
    currentModel,
  } = useAiChat();

  // Load models and files on mount
  useEffect(() => {
    loadModels();
    refreshFiles();
  }, [loadModels, refreshFiles]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;
    if (!canSend) return;

    const messageContent = inputValue.trim();
    const messageFiles = [...attachedFiles];

    setInputValue("");
    setAttachedFiles([]);

    // Send message with attached files context
    let fullContent = messageContent;
    if (messageFiles.length > 0) {
      const fileContext = messageFiles
        .map((file) => {
          let context = `[File: ${file.originalName}]`;
          if (file.analysis?.summary) {
            context += `\nSummary: ${file.analysis.summary}`;
          }
          if (file.extractedText) {
            context += `\nContent: ${file.extractedText.substring(0, 1000)}...`;
          }
          return context;
        })
        .join("\n\n");

      fullContent = `${messageContent}\n\nAttached files:\n${fileContext}`;
    }

    await sendMessage(fullContent);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      await uploadFiles(selectedFiles, {
        extractText: true,
        analyzeWithAI: true,
      });

      setSelectedFiles([]);
    } catch (error) {
      console.error("File upload failed:", error);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter((file) => {
      const allowedTypes = [
        ".pdf",
        ".doc",
        ".docx",
        ".txt",
        ".rtf",
        ".xls",
        ".xlsx",
        ".csv",
      ];
      return allowedTypes.some((type) =>
        file.name.toLowerCase().endsWith(type)
      );
    });

    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileAttach = (file: FileItem) => {
    if (!attachedFiles.some((f) => f.id === file.id)) {
      setAttachedFiles((prev) => [...prev, file]);
    }
  };

  const handleFileDetach = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
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

  // Show file error as toast/notification (non-blocking)
  useEffect(() => {
    if (fileError) {
      console.error("File error:", fileError);
      // In a real app, you might want to show a toast notification here
    }
  }, [fileError]);

  return (
    <div
      className={cn("flex h-full relative", className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-50/90 dark:bg-blue-950/90 flex items-center justify-center border-2 border-dashed border-blue-500 rounded-lg">
          <div className="text-center">
            <Upload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-blue-700 dark:text-blue-300">
              Drop files here to upload
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Supports PDF, Word, Excel, and text files
            </p>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-lg font-semibold">AI Assistant</h1>
                  {currentModel && (
                    <p className="text-sm text-muted-foreground">
                      {currentModel.name}
                    </p>
                  )}
                </div>
              </div>

              {hasMessages && (
                <Badge variant="secondary" className="text-xs">
                  {messages.length} messages
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <ModelSelector
                models={availableModels}
                selectedModel={selectedModel}
                onModelChange={changeModel}
                disabled={isLoading || isStreaming}
              />

              {hasMessages && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearConversation}
                  disabled={isLoading || isStreaming}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Ask questions, upload files for analysis using the
                      paperclip button, or start typing below
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <MessageItem key={index} message={message} />
                  ))}

                  {isStreaming && streamingContent && (
                    <StreamingMessage content={streamingContent} />
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-4 space-y-3">
            {/* Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Attached files:
                </p>
                <div className="space-y-2">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 bg-accent/50 rounded-md"
                    >
                      <FileAttachment file={file} compact />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileDetach(file.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Row */}
            <div className="space-y-3">
              {/* Uploaded Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="max-w-32 truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileRemove(index)}
                        className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {selectedFiles.length > 0 && (
                    <Button
                      onClick={handleFileUpload}
                      size="sm"
                      className="h-8 px-3 text-xs"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      Upload {selectedFiles.length} file
                      {selectedFiles.length > 1 ? "s" : ""}
                    </Button>
                  )}
                </div>
              )}

              {/* Chat Input */}
              <div className="flex items-end gap-3 p-4 bg-muted/30 rounded-xl border border-border/60 shadow-sm transition-all duration-200 focus-within:shadow-md focus-within:border-border">
                <input
                  type="file"
                  ref={(ref) => {
                    if (ref) {
                      ref.style.display = "none";
                      ref.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files) {
                          const newFiles = Array.from(target.files);
                          setSelectedFiles((prev) => [...prev, ...newFiles]);
                          target.value = ""; // Reset input
                        }
                      };
                    }
                  }}
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const input = document.querySelector(
                      'input[type="file"]'
                    ) as HTMLInputElement;
                    input?.click();
                  }}
                  disabled={isLoading || isStreaming}
                  className="shrink-0 h-10 w-10 hover:bg-background/80 transition-colors"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </Button>

                <div className="flex-1 min-w-0">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading || isStreaming}
                    className="border-0 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:ring-0 shadow-none px-0 min-h-[40px]"
                  />
                </div>

                <Button
                  onClick={isStreaming ? stopStreaming : handleSendMessage}
                  disabled={
                    !isStreaming &&
                    ((!inputValue.trim() && attachedFiles.length === 0) ||
                      !canSend)
                  }
                  size="icon"
                  className={cn(
                    "shrink-0 h-10 w-10 transition-all duration-200",
                    isStreaming
                      ? "bg-destructive hover:bg-destructive/90 text-white"
                      : (!inputValue.trim() && attachedFiles.length === 0) ||
                        !canSend
                      ? "bg-muted text-muted-foreground hover:bg-muted"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                  )}
                >
                  {isStreaming ? (
                    <Square className="h-4 w-4" />
                  ) : isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
