"use client";

import { useEffect, useState } from "react";
import { useAiChat } from "@/hooks/use-ai-chat";
import { ModelSelector } from "./model-selector";
import { StreamingMessage } from "./streaming-message";
import { AIResponse } from "./ai-response";
import { MessageItem } from "./message-item";
import { FileUpload } from "./file-upload";
import { FileAttachment } from "./file-attachment";
import { FileList } from "./file-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt: Date;
  analysis?: {
    status: "pending" | "processing" | "completed" | "error";
    extractedText?: string;
    summary?: string;
    insights?: string[];
  };
}

interface EnhancedChatInterfaceProps {
  className?: string;
}

export function EnhancedChatInterface({
  className,
}: EnhancedChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);

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

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

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
          let context = `[File: ${file.name}]`;
          if (file.analysis?.summary) {
            context += `\nSummary: ${file.analysis.summary}`;
          }
          if (file.analysis?.extractedText) {
            context += `\nContent: ${file.analysis.extractedText.substring(
              0,
              1000
            )}...`;
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

    // Simulate file upload and analysis
    const newFiles: FileItem[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      analysis: {
        status: "processing" as const,
      },
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setSelectedFiles([]);
    setShowFileUpload(false);

    // Simulate analysis completion
    setTimeout(() => {
      setUploadedFiles((prev) =>
        prev.map((file) => {
          if (newFiles.some((newFile) => newFile.id === file.id)) {
            return {
              ...file,
              analysis: {
                status: "completed" as const,
                summary: `AI analysis of ${file.name}: This document contains important information that can be referenced in conversations.`,
                extractedText: "Sample extracted text from the document...",
                insights: ["Key Point 1", "Key Point 2", "Key Point 3"],
              },
            };
          }
          return file;
        })
      );
    }, 3000);
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

  return (
    <div className={cn("flex h-full", className)}>
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

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-1 h-4 w-4" />
                    Files ({uploadedFiles.length})
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-96">
                  <SheetHeader>
                    <SheetTitle>File Management</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <Tabs defaultValue="uploaded" className="h-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="uploaded">Files</TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                      </TabsList>
                      <TabsContent value="uploaded" className="mt-4">
                        <FileList
                          files={uploadedFiles}
                          onFileSelect={handleFileAttach}
                          onUploadClick={() => setShowFileUpload(true)}
                        />
                      </TabsContent>
                      <TabsContent value="upload" className="mt-4">
                        <div className="space-y-4">
                          <FileUpload
                            selectedFiles={selectedFiles}
                            onFileSelect={handleFileSelect}
                            onFileRemove={handleFileRemove}
                          />
                          {selectedFiles.length > 0 && (
                            <Button
                              onClick={handleFileUpload}
                              className="w-full"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload {selectedFiles.length} file(s)
                            </Button>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </SheetContent>
              </Sheet>

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
                      Ask questions, upload files for analysis, or start typing
                      below
                    </p>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFileUpload(true)}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        Upload File
                      </Button>
                    </div>
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
            <div className="flex items-end space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFileUpload(true)}
                disabled={isLoading || isStreaming}
                className="shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <div className="flex-1">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading || isStreaming}
                  className="min-h-[40px]"
                />
              </div>

              {isStreaming ? (
                <Button
                  onClick={stopStreaming}
                  variant="destructive"
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
                    !canSend
                  }
                  size="icon"
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Sheet */}
      {showFileUpload && (
        <Sheet open={showFileUpload} onOpenChange={setShowFileUpload}>
          <SheetContent side="right" className="w-96">
            <SheetHeader>
              <SheetTitle>Upload Files</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <FileUpload
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
              />
              {selectedFiles.length > 0 && (
                <Button onClick={handleFileUpload} className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {selectedFiles.length} file(s)
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
