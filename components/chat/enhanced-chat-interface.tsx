"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useFileUpload, type FileItem } from "@/hooks/use-file-upload";
import { useSearchParams } from "next/navigation";
import { ModelSelector } from "./model-selector";
import { StreamingMessage } from "./streaming-message";
import { MessageItem } from "./message-item";
import { FileProcessingMessage } from "./file-processing-message";
import { FileAttachment } from "./file-attachment";
import { ExtendedThinkingToggle } from "./extended-thinking-toggle";
import { ThinkingModeToggle } from "./thinking-mode-toggle";
import { ReasoningEffortSelector } from "./reasoning-effort-selector";
import { SystemInstructionButton } from "./system-instruction-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Brain,
  Send,
  Square,
  AlertCircle,
  Loader2,
  FileText,
  Upload,
  Paperclip,
  X,
  Edit2,
  Check,
  Plus,
  Library,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  processFileForAI,
  validateFileForAI,
} from "@/lib/utils/file-processing";

// FileItem interface is now imported from the hook

interface EnhancedChatInterfaceProps {
  className?: string;
}

export function EnhancedChatInterface({
  className,
}: EnhancedChatInterfaceProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Render count tracking
  const [inputValue, setInputValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [conversationTitle, setConversationTitle] =
    useState<string>("AI Assistant");
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [showFilePicker, setShowFilePicker] = useState(false);

  // Ref for auto-scrolling to bottom
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get conversation ID from URL
  const searchParams = useSearchParams();

  // Use real file upload hook
  const {
    files: userFiles,
    isUploading,
    uploadFiles,
    refreshFiles,
    error: fileError,
  } = useFileUpload();

  const {
    messages,
    isLoading,
    isStreaming,
    isProcessingFiles,
    streamingContent,
    error,
    selectedModel,
    availableModels,
    sendMessage,
    stopStreaming,
    changeModel,
    extendedThinking,
    toggleExtendedThinking,
    thinkingMode,
    toggleThinkingMode,
    reasoningEffort,
    setReasoningEffort,
    systemInstruction,
    setSystemInstruction,
    clearError,
    loadModels,
    setMessages,
    hasMessages,
    canSend,
    currentModel,
    isClaudeModel,
    isGeminiModel,
    isOpenAIModel,
  } = useAiChat();

  // We'll just save conversations to database, not display them

  // Load models and files on mount
  useEffect(() => {
    loadModels();
    refreshFiles();
  }, [loadModels, refreshFiles]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-scroll when streaming content changes
  useEffect(() => {
    if (isStreaming && streamingContent) {
      scrollToBottom();
    }
  }, [streamingContent, isStreaming, scrollToBottom]);

  // Function to load conversation data from the database
  const loadConversationData = useCallback(
    async (conversationId: string) => {
      setIsLoadingConversation(true);

      try {
        // Fetch conversation details and messages in parallel
        const [conversationResponse, messagesResponse] = await Promise.all([
          fetch(`/api/conversations/${conversationId}`),
          fetch(`/api/conversations/${conversationId}/messages`)
        ]);

        if (conversationResponse.status === 404) {
          // Conversation not found - clean up URL and reset state
          setCurrentConversationId(null);
          setConversationTitle("AI Assistant");
          setMessages([]);

          // Remove conversation ID from URL
          const url = new URL(window.location.href);
          url.searchParams.delete("conversation");
          window.history.replaceState({}, "", url);

          return;
        }

        if (!conversationResponse.ok) throw new Error("Failed to load conversation");
        if (!messagesResponse.ok) throw new Error("Failed to load messages");

        const [conversationResult, messagesResult] = await Promise.all([
          conversationResponse.json(),
          messagesResponse.json()
        ]);

        if (!conversationResult.success) {
          throw new Error(conversationResult.message || "Failed to load conversation");
        }
        if (!messagesResult.success) {
          throw new Error(messagesResult.message || "Failed to load messages");
        }

        const conversation = conversationResult.data;

        // Update conversation title
        if (conversation.title) {
          setConversationTitle(conversation.title);
        }

        // Convert database messages to AI chat messages format
        const aiMessages = messagesResult.data.map(
          (message: {
            id: string;
            role: string;
            content: string;
            metadata?: { model?: string };
          }) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            model: message.metadata?.model || undefined,
          })
        );

        // Set the loaded messages directly (no clearing first to prevent flashing)
        setMessages(aiMessages);
        
        // Clear system instruction for loaded conversation (fresh start per conversation)
        setSystemInstruction("");

        // Scroll to bottom after loading conversation
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        setConversationTitle("AI Assistant");
        // Don't clear messages on error to maintain current state
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [setMessages, scrollToBottom, setSystemInstruction]
  );

  // Load conversation data when conversation ID changes
  useEffect(() => {
    const conversationId = searchParams.get("conversation");

    if (conversationId && conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId);
      loadConversationData(conversationId);
    } else if (!conversationId && currentConversationId) {
      // If no conversation ID in URL but we have one set, clear it
      setCurrentConversationId(null);
      setConversationTitle("AI Assistant");
      // Only clear messages when intentionally starting a new conversation
      if (!conversationId) {
        setMessages([]);
        setSystemInstruction(""); // Clear system instruction for new conversation
      }
    }
  }, [searchParams, currentConversationId, loadConversationData, setSystemInstruction]);

  // Rename conversation
  const handleRenameConversation = async (newTitle: string) => {
    if (!currentConversationId || !newTitle.trim()) {
      setIsEditingTitle(false);
      setTempTitle("");
      return;
    }

    try {
      const response = await fetch(
        `/api/conversations/${currentConversationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTitle.trim(),
          }),
        }
      );

      if (response.ok) {
        setConversationTitle(newTitle.trim());
        setIsEditingTitle(false);
        setTempTitle("");
      } else {
        // Reset to original title on error
        setIsEditingTitle(false);
        setTempTitle("");
      }
    } catch (error) {
      setIsEditingTitle(false);
      setTempTitle("");
    }
  };

  const startEditingTitle = () => {
    setTempTitle(conversationTitle);
    setIsEditingTitle(true);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setTempTitle("");
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameConversation(tempTitle);
    } else if (e.key === "Escape") {
      cancelEditingTitle();
    }
  };

  // Save conversation to database when sending message
  const saveToDatabase = async (content: string) => {
    try {
      if (currentConversationId) {
        // If we have a current conversation ID, add message to that conversation

        const response = await fetch(
          `/api/conversations/${currentConversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: content,
              model: selectedModel, // Pass the selected model to ensure proper routing
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
        }
      } else {
        // Create a new conversation

        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
            initialMessage: content,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Handle error silently
        } else {
          // Get the new conversation ID and set it
          const result = await response.json();

          if (result.success && result.data) {
            setCurrentConversationId(result.data.id);
            setConversationTitle(result.data.title);

            // Update the URL with the new conversation ID without page reload
            const url = new URL(window.location.href);
            url.searchParams.set("conversation", result.data.id);
            window.history.pushState({}, "", url);
          }
        }
      }
    } catch (error) {}
  };

  const handleSendMessage = async () => {
    // DEBUG: Check initial state
    console.log("🎯 SEND MESSAGE DEBUG - Starting:");
    console.log("- selectedFiles count:", selectedFiles.length);
    console.log(
      "- selectedFiles details:",
      selectedFiles.map((f) => ({ name: f.name, type: f.type, size: f.size }))
    );
    console.log("- attachedFiles count:", attachedFiles.length);
    console.log(
      "- attachedFiles details:",
      attachedFiles.map((f) => ({ name: f.originalName, mimeType: f.mimeType }))
    );

    // Prevent sending messages if not authenticated
    if (!isAuthenticated) {
      return;
    }

    if (
      !inputValue.trim() &&
      attachedFiles.length === 0 &&
      selectedFiles.length === 0
    )
      return;
    if (!canSend) return;

    const messageContent = inputValue.trim();
    let messageFiles = [...attachedFiles];

    // Handle file processing based on model type
    const isGeminiModel = selectedModel.startsWith("gemini");
    const isClaudeModelForUpload = selectedModel.includes("claude");

    if (selectedFiles.length > 0) {
      if (isClaudeModelForUpload) {
        // For Claude models: Upload images to Supabase and use URLs
        try {
          const processedFiles = [];

          for (const file of selectedFiles) {
            // Validate file before processing
            const validation = validateFileForAI(file);
            if (!validation.isValid) {
              // You could show a toast/error message here
              continue;
            }

            // For Claude: Upload image files to Supabase, use base64 for non-images
            if (file.type.startsWith("image/")) {
              // Upload image to Supabase using direct API call
              const formData = new FormData();
              formData.append("files", file);
              formData.append("extractText", "false"); // Don't extract text from images
              formData.append("analyzeWithAI", "false"); // Don't analyze with AI

              const uploadResponse = await fetch("/api/files/upload", {
                method: "POST",
                body: formData,
              });

              const uploadResult = await uploadResponse.json();

              if (uploadResult.success && uploadResult.data.file) {
                const uploadedFile = uploadResult.data.file;
                processedFiles.push({
                  id: uploadedFile.id,
                  filename: uploadedFile.filename,
                  originalName: uploadedFile.originalName,
                  mimeType: uploadedFile.mimeType,
                  size: uploadedFile.size,
                  url: uploadedFile.url, // Supabase URL for Claude
                  uploadStatus: uploadedFile.uploadStatus,
                  analysisStatus: uploadedFile.analysisStatus,
                  uploadedAt: new Date(uploadedFile.createdAt),
                  metadata: {
                    type: file.type,
                    isUrl: true, // Flag to indicate this is a URL
                  },
                });
              }
            } else {
              // For non-image files, use base64
              const fileData = await processFileForAI(file);
              processedFiles.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                filename: file.name,
                originalName: file.name,
                mimeType: file.type,
                size: file.size,
                url: undefined,
                uploadStatus: "completed" as const,
                analysisStatus: "completed" as const,
                uploadedAt: new Date(),
                metadata: {
                  data: fileData.data,
                  type: file.type,
                  isBase64: true,
                },
              });
            }
          }

          // Add processed files to message
          messageFiles = [...messageFiles, ...processedFiles];

          // Clear selected files after processing
          setSelectedFiles([]);
        } catch (error) {
          return;
        }
      } else if (isGeminiModel) {
        // For Gemini models: Process files directly to base64 (no Supabase upload)
        try {
          const processedFiles = [];

          for (const file of selectedFiles) {
            // Validate file before processing
            const validation = validateFileForAI(file);
            if (!validation.isValid) {
              // You could show a toast/error message here
              continue;
            }

            // Convert file to base64 for Gemini
            const fileData = await processFileForAI(file);
            processedFiles.push({
              id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
              filename: file.name, // For FileItem compatibility
              originalName: file.name,
              mimeType: file.type,
              size: file.size,
              url: undefined, // No URL for base64 files
              uploadStatus: "completed" as const, // For FileItem compatibility
              analysisStatus: "completed" as const, // For FileItem compatibility
              uploadedAt: new Date(), // For FileItem compatibility
              metadata: {
                data: fileData.data, // Base64 data for AI processing
                type: file.type, // For compatibility with AI message format
                isBase64: true, // Flag to indicate this is base64 data
              },
            });
          }

          // Add processed files to message
          messageFiles = [...messageFiles, ...processedFiles];

          // Clear selected files after processing
          setSelectedFiles([]);
        } catch (error) {
          return;
        }
      } else {
        // For other non-Gemini, non-Claude models: Process files to base64 for AI analysis
        try {
          const processedFiles = [];

          for (const file of selectedFiles) {
            // Validate file before processing
            const validation = validateFileForAI(file);
            if (!validation.isValid) {
              // You could show a toast/error message here
              continue;
            }

            // Convert file to base64 for AI processing
            const fileData = await processFileForAI(file);
            processedFiles.push({
              id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
              filename: file.name, // For FileItem compatibility
              originalName: file.name,
              mimeType: file.type,
              size: file.size,
              url: undefined, // No URL for base64 files
              uploadStatus: "completed" as const, // For FileItem compatibility
              analysisStatus: "completed" as const, // For FileItem compatibility
              uploadedAt: new Date(), // For FileItem compatibility
              metadata: {
                data: fileData.data, // Base64 data for AI processing
                type: file.type, // For compatibility with AI message format
                isBase64: true, // Flag to indicate this is base64 data
              },
            });
          }

          // Add processed files to message
          messageFiles = [...messageFiles, ...processedFiles];

          // Clear selected files after processing
          setSelectedFiles([]);
        } catch (error) {
          return; // Don't send message if file processing fails
        }
      }
    }

    setInputValue("");
    setAttachedFiles([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // For messages with files, let Dolphin analysis handle the file content
    // Don't add manual file context since Dolphin provides better analysis

    // Send message to AI - pass files for all models
    if (messageFiles.length > 0) {
      // For all models, pass files with their data
      const allFiles: File[] = [];

      // Process message files
      if (messageFiles.length > 0) {
        for (const fileItem of messageFiles) {
          if (fileItem.metadata?.isBase64 && fileItem.metadata?.data) {
            // File has base64 data (processed directly for Gemini and non-Claude models)
            // Convert base64 back to File object for sendMessage compatibility
            const binaryString = atob(fileItem.metadata.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: fileItem.metadata.type });
            const file = new File([blob], fileItem.originalName, {
              type: fileItem.metadata.type,
            });
            // Attach the base64 data to the file for AI processing
            (file as any).data = fileItem.metadata.data;
            allFiles.push(file);
          } else if (
            fileItem.metadata?.isUrl &&
            fileItem.url &&
            isClaudeModelForUpload
          ) {
            // For Claude models: Use URL directly, don't fetch the file
            const file = new File([], fileItem.originalName, {
              type: fileItem.mimeType,
            });
            // Attach the URL to the file for Claude processing
            (file as any).url = fileItem.url;
            allFiles.push(file);
          } else if (fileItem.url) {
            // File has URL (from Supabase) - fetch and convert to File for non-Claude models
            const response = await fetch(fileItem.url);
            const blob = await response.blob();
            const file = new File([blob], fileItem.originalName, {
              type: fileItem.mimeType,
            });
            allFiles.push(file);
          }
        }
      }

      // DEBUG: Log what we're sending
      console.log("🔥 ENHANCED CHAT DEBUG - Sending with files:");
      console.log("- Message content:", messageContent);
      console.log("- All files count:", allFiles.length);
      console.log(
        "- All files details:",
        allFiles.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
          hasData: !!(f as any).data,
        }))
      );

      await sendMessage(messageContent, allFiles);
    } else {
      // DEBUG: Log text-only message
      console.log("🔥 ENHANCED CHAT DEBUG - Sending text-only:");
      console.log("- Message content:", messageContent);

      await sendMessage(messageContent);
    }

    // Save to database after AI response is received
    // Note: We'll implement this in the useAiChat hook to avoid duplicate AI calls

    // Scroll to bottom after sending message
    setTimeout(scrollToBottom, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        150
      )}px`;
    }
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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

  const handleFileDetach = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleAttachExistingFile = (file: FileItem) => {
    // Check if file is already attached
    if (!attachedFiles.some((f) => f.id === file.id)) {
      setAttachedFiles((prev) => [...prev, file]);
    }
    setShowFilePicker(false);
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

  // Handle file errors
  if (fileError) {
    // In a real app, you might want to show a toast notification here
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full relative max-w-full",
        className
      )}
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
      <div className="flex-1 flex flex-col min-w-0 w-full h-full">
        {/* Header - Fixed at top */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-6 w-6 text-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    {isEditingTitle && currentConversationId ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          onKeyDown={handleTitleKeyPress}
                          onBlur={() => handleRenameConversation(tempTitle)}
                          className="text-lg font-semibold h-8 px-2 min-w-[200px]"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRenameConversation(tempTitle)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditingTitle}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <h1 className="text-lg font-semibold">
                          {conversationTitle}
                          {isLoadingConversation && (
                            <span className="ml-2 inline-block">
                              <Loader2 className="h-3 w-3 animate-spin inline" />
                            </span>
                          )}
                        </h1>
                        {currentConversationId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={startEditingTitle}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
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
              {/* Extended Thinking Toggle - Show only for Claude models */}
              {isClaudeModel && (
                <>
                  <ExtendedThinkingToggle
                    enabled={extendedThinking}
                    onToggle={toggleExtendedThinking}
                    disabled={isLoading || isStreaming}
                  />
                  {/* Debug info */}
                  <div className="text-xs text-muted-foreground">
                    Thinking: {extendedThinking ? "ON" : "OFF"}
                  </div>
                </>
              )}
              
              {/* Thinking Mode Toggle - Show only for Gemini models */}
              <ThinkingModeToggle
                enabled={thinkingMode}
                onToggle={toggleThinkingMode}
                disabled={isLoading || isStreaming}
                selectedModel={selectedModel}
              />

              {/* Reasoning Effort Selector - Show only for OpenAI models */}
              {isOpenAIModel && (
                <ReasoningEffortSelector
                  value={reasoningEffort}
                  onValueChange={setReasoningEffort}
                  disabled={isLoading || isStreaming}
                />
              )}

              <SystemInstructionButton
                systemInstruction={systemInstruction}
                onSystemInstructionChange={setSystemInstruction}
                disabled={isLoading || isStreaming}
              />

              <ModelSelector
                models={availableModels}
                selectedModel={selectedModel}
                onModelChange={changeModel}
                disabled={isLoading || isStreaming}
              />

            </div>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-hidden min-w-0 relative">
          <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
            <div className="p-4 space-y-4 pb-4 max-w-full min-h-full">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  {isLoadingConversation ? (
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                      <h3 className="text-lg font-semibold mb-2">
                        Loading conversation...
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Please wait while we fetch your messages
                      </p>
                    </div>
                  ) : (
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
                  )}
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    // Only show user or assistant messages
                    if (message.role !== "user" && message.role !== "assistant")
                      return null;

                    return (
                      <MessageItem
                        key={index}
                        message={{
                          id: message.id,
                          content: message.content,
                          role: message.role,
                          conversationId: "temp-conversation",
                          timestamp: new Date(),
                          metadata: {
                            model: message.model,
                          },
                        }}
                      />
                    );
                  })}

                  {isProcessingFiles && <FileProcessingMessage />}

                  {isStreaming && streamingContent && (
                    <StreamingMessage
                      content={streamingContent}
                      isStreaming={isStreaming}
                      onStop={stopStreaming}
                      model={selectedModel}
                    />
                  )}
                </>
              )}

              {/* Invisible div to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 w-full min-w-0 z-10">
          <div className="p-4 space-y-3 max-w-full">
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
                      <FileAttachment
                        file={{
                          id: file.id,
                          name: file.originalName,
                          size: file.size,
                          type: file.mimeType,
                          url: file.url,
                          analysis: file.analysis
                            ? {
                                status: file.analysis.summary
                                  ? "completed"
                                  : "pending",
                                summary: file.analysis.summary,
                                insights: file.analysis.insights || [],
                              }
                            : undefined,
                        }}
                        compact
                      />
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
              {/* Selected Files Preview - Will upload when message is sent */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4">
                  {selectedFiles.map((file, index) => {
                    const isImage = file.type.startsWith("image/");
                    const imageUrl = isImage ? URL.createObjectURL(file) : null;

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                      >
                        {isImage && imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={file.name}
                            className="h-8 w-8 rounded object-cover border border-border/50"
                            onLoad={() => {
                              // Clean up object URL after image loads
                              setTimeout(
                                () => URL.revokeObjectURL(imageUrl),
                                1000
                              );
                            }}
                          />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
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
                    );
                  })}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Will upload when message is sent
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="flex items-end gap-3 p-4 bg-muted/30 rounded-xl border border-border/60 shadow-sm transition-all duration-200 focus-within:shadow-md focus-within:border-border min-w-0 max-w-full overflow-hidden">
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
                  accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
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
                  title="Upload new files"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </Button>

                {/* Attach existing files button */}
                {/* <DropdownMenu
                  open={showFilePicker}
                  onOpenChange={setShowFilePicker}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading || isStreaming}
                      className="shrink-0 h-10 w-10 hover:bg-background/80 transition-colors"
                      title="Attach existing files"
                    >
                      <Library className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 p-4" align="start">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Attach Files</h4>
                      {userFiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No files uploaded yet. Use the paperclip button to
                          upload files first.
                        </p>
                      ) : (
                        <ScrollArea className="max-h-48">
                          <div className="space-y-2">
                            {userFiles
                              .filter(
                                (file) =>
                                  !attachedFiles.some(
                                    (attached) => attached.id === file.id
                                  )
                              )
                              .map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                                  onClick={() => handleAttachExistingFile(file)}
                                >
                                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {file.originalName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {Math.round(file.size / 1024)} KB
                                      </p>
                                    </div>
                                  </div>
                                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                                </div>
                              ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu> */}

                <div className="flex-1 min-w-0">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      !isAuthenticated
                        ? "Please sign in to chat..."
                        : "Type your message..."
                    }
                    disabled={
                      !isAuthenticated ||
                      isAuthLoading ||
                      isLoading ||
                      isStreaming
                    }
                    className="border-0 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:ring-0 shadow-none px-0 min-h-[40px] max-h-[150px] resize-none overflow-y-auto"
                    rows={1}
                  />
                </div>

                <Button
                  onClick={isStreaming ? stopStreaming : handleSendMessage}
                  disabled={
                    !isAuthenticated ||
                    (!isStreaming &&
                      ((!inputValue.trim() &&
                        attachedFiles.length === 0 &&
                        selectedFiles.length === 0) ||
                        !canSend ||
                        isUploading))
                  }
                  size="icon"
                  className={cn(
                    "shrink-0 h-10 w-10 transition-all duration-200",
                    isStreaming
                      ? "bg-destructive hover:bg-destructive/90 text-white"
                      : (!inputValue.trim() &&
                          attachedFiles.length === 0 &&
                          selectedFiles.length === 0) ||
                        !canSend
                      ? "bg-muted text-muted-foreground hover:bg-muted"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                  )}
                >
                  {isStreaming ? (
                    <Square className="h-4 w-4" />
                  ) : isLoading || isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {inputValue.length > 0 && (
                <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground px-4">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  <span>{inputValue.length} characters</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
