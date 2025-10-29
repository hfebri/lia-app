"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useConversations } from "@/hooks/use-conversations";
import { useFileUpload, type FileItem } from "@/hooks/use-file-upload";
import { useSearchParams, useRouter } from "next/navigation";
import { ModelSelector } from "./model-selector";
import { StreamingMessage } from "./streaming-message";
import { MessageItem } from "./message-item";
import { FileProcessingMessage } from "./file-processing-message";
import { TypingIndicator } from "./typing-indicator";
import { FileAttachment } from "./file-attachment";
import { ContextWarning } from "./context-warning";
import { ExtendedThinkingToggle } from "./extended-thinking-toggle";
import { WebSearchToggle } from "./web-search-toggle";
import { ThinkingModeToggle } from "./thinking-mode-toggle";
import { ReasoningEffortSelector } from "./reasoning-effort-selector";
import { SystemInstructionButton } from "./system-instruction-button";
import { ChatHistorySkeleton } from "./message-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedChatInterfaceProps {
  className?: string;
}

export function EnhancedChatInterface({
  className,
}: EnhancedChatInterfaceProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

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
  const [preventModelOverride, setPreventModelOverride] = useState(false);

  // Ref for auto-scrolling to bottom
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ref to track if we just created a conversation (to skip fetch)
  const justCreatedConversationRef = useRef<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  const { isUploading, refreshFiles, error: fileError } = useFileUpload();

  const { refreshConversations, createConversation } = useConversations();

  const {
    messages,
    isLoading,
    isStreaming,
    isProcessingFiles,
    fileProcessingProgress,
    streamingContent,
    error,
    selectedModel,
    availableModels,
    sendMessage,
    stopStreaming,
    changeModel,
    extendedThinking,
    toggleExtendedThinking,
    webSearch,
    toggleWebSearch,
    thinkingMode,
    toggleThinkingMode,
    reasoningEffort,
    setReasoningEffort,
    systemInstruction,
    setSystemInstruction,
    clearError,
    loadModels,
    setMessages,
    startNewConversation,
    setConversationId,
    hasMessages,
    canSend,
    currentModel,
    isClaudeModel,
    isOpenAIModel,
    setConversationModel,
  } = useAiChat({
    preCreateConversation: async ({ title, aiModel }) => {
      const created = await createConversation({
        title,
        aiModel,
      });

      if (!created) {
        return null;
      }

      return {
        id: created.id,
        title: created.title,
      };
    },
    onConversationCreated: (conversationData: {
      id: string;
      title: string | null;
    }) => {
      // Mark that we just created this conversation (to skip fetch in useEffect)
      justCreatedConversationRef.current = conversationData.id;

      // Update local state FIRST to prevent useEffect from triggering loadConversationData
      setCurrentConversationId(conversationData.id);

      // Update conversation title if provided
      if (conversationData.title) {
        setConversationTitle(conversationData.title);
      }

      // Then update URL using Next.js router (this properly updates searchParams)
      router.push(`/?conversation=${conversationData.id}`, { scroll: false });

      // Ensure the chat history/sidebar reflects the newly saved conversation
      refreshConversations().catch((refreshError) => {
        console.warn(
          "Failed to refresh conversations after creation:",
          refreshError
        );
      });
    },
  });

  // Load models and files on mount
  useEffect(() => {
    loadModels();
    refreshFiles();
  }, [loadModels, refreshFiles]);

  // Handle global "new chat" navigation signal via query param
  useEffect(() => {
    if (searchParams.get("newChat") !== "1") {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    // Ensure any active streaming stops before clearing
    stopStreaming();
    startNewConversation();
    justCreatedConversationRef.current = null;

    // Reset local UI state
    setCurrentConversationId(null);
    setConversationTitle("AI Assistant");
    setInputValue("");
    setSelectedFiles([]);
    setAttachedFiles([]);
    setPreventModelOverride(false);

    // Clean up query params so the URL reflects the reset state
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("newChat");
    nextUrl.searchParams.delete("conversation");
    const cleanedSearch = nextUrl.searchParams.toString();
    const destination = cleanedSearch
      ? `${nextUrl.pathname}?${cleanedSearch}`
      : nextUrl.pathname;

    router.replace(destination || "/", { scroll: false });
  }, [
    searchParams,
    router,
    startNewConversation,
    stopStreaming,
    setPreventModelOverride,
    setCurrentConversationId,
    setConversationTitle,
    setInputValue,
    setSelectedFiles,
    setAttachedFiles,
  ]);

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
        const [conversationResponse, messagesResponse] = await Promise.all([
          fetch(`/api/conversations/${conversationId}`),
          fetch(`/api/conversations/${conversationId}/messages`),
        ]);

        if (conversationResponse.status === 404) {
          // Conversation not found - clean up URL and reset state
          setCurrentConversationId(null);
          setConversationTitle("AI Assistant");
          setMessages([]);

          // Remove conversation ID from URL using Next.js router
          router.replace("/", { scroll: false });

          return;
        }

        if (!conversationResponse.ok)
          throw new Error("Failed to load conversation");
        if (!messagesResponse.ok) throw new Error("Failed to load messages");

        const [conversationResult, messagesResult] = await Promise.all([
          conversationResponse.json(),
          messagesResponse.json(),
        ]);

        if (!conversationResult.success) {
          throw new Error(
            conversationResult.message || "Failed to load conversation"
          );
        }
        if (!messagesResult.success) {
          throw new Error(messagesResult.message || "Failed to load messages");
        }

        const conversation = conversationResult.data;

        // Sync conversation ID to useAiChat hook state
        setConversationId(conversationId);

        // Update conversation title
        // But only if we're not in the middle of a manual model change
        if (conversation.title && !preventModelOverride) {
          setConversationTitle(conversation.title);
        }

        // Update selected model to match the conversation's model
        // But only if we're not in the middle of a manual model change
        if (conversation.aiModel && !preventModelOverride) {
          setConversationModel(conversation.aiModel);
        }

        // Convert database messages to AI chat messages format
        const aiMessages = messagesResult.data.map(
          (message: {
            id: string;
            role: string;
            content: string;
            metadata?: { model?: string; files?: any[] };
          }) => {
            // Extract files from metadata if present
            const files = message.metadata?.files
              ?.map((f) => ({
                url: f.url,
                data: f.data,
                type: f.type,
                name: f.name,
              }))
              .filter((f) => f.url || f.data);

            return {
              id: message.id,
              role: message.role,
              content: message.content,
              model: message.metadata?.model || undefined,
              files: files && files.length > 0 ? files : undefined,
            };
          }
        );

        // Set the loaded messages directly (no clearing first to prevent flashing)
        // But only if we're not in the middle of a manual model change
        if (!preventModelOverride) {
          setMessages(aiMessages);
        }

        // Clear system instruction for loaded conversation (fresh start per conversation)
        setSystemInstruction("");

        // Scroll to bottom after loading conversation
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("❌ Error loading conversation:", error);
        setConversationTitle("AI Assistant");
        // Don't clear messages on error to maintain current state
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [
      setMessages,
      scrollToBottom,
      setSystemInstruction,
      setConversationModel,
      preventModelOverride,
      router,
    ]
  );

  // Load conversation data when conversation ID changes
  useEffect(() => {
    const conversationId = searchParams.get("conversation");

    if (conversationId && conversationId !== currentConversationId) {
      // Check if we just created this conversation
      if (justCreatedConversationRef.current === conversationId) {
        // We just created this conversation, no need to fetch
        justCreatedConversationRef.current = null; // Clear the flag
        setCurrentConversationId(conversationId); // Just sync the state
        return;
      }

      // Loading a different conversation - need to fetch
      setCurrentConversationId(conversationId);
      loadConversationData(conversationId);
    } else if (!conversationId && currentConversationId) {
      // CRITICAL FIX: Don't clear if we just created a conversation and URL hasn't updated yet
      if (justCreatedConversationRef.current === currentConversationId) {
        return;
      }

      // No conversation ID in URL but we have one set - clear everything
      setCurrentConversationId(null);
      setConversationTitle("AI Assistant");
      startNewConversation(); // Clear messages and reset conversation state
    }
  }, [
    searchParams,
    currentConversationId,
    loadConversationData,
    startNewConversation,
  ]);

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
    } catch {
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

  const handleSendMessage = async () => {
    // Prevent sending messages if not authenticated
    if (!isAuthenticated) {
      return;
    }

    if (
      !inputValue.trim() &&
      attachedFiles.length === 0 &&
      selectedFiles.length === 0
    ) {
      return;
    }

    if (!canSend) {
      return;
    }

    const messageContent = inputValue.trim();

    // Process files: convert to base64 for images
    const filesToProcess: File[] = [];

    // Process selectedFiles (raw File objects from file input)
    for (const file of selectedFiles) {
      if (file.type.startsWith("image/")) {
        // Convert image to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.readAsDataURL(file);
        });

        const base64Data = await base64Promise;
        (file as any).data = base64Data;
        filesToProcess.push(file);
      } else {
        filesToProcess.push(file);
      }
    }

    // Process attachedFiles (FileItem objects from hook)
    for (const f of attachedFiles) {
      const file = new File([], f.originalName, { type: f.mimeType });
      if (f.url) (file as any).url = f.url;
      if (f.metadata?.data) (file as any).data = f.metadata.data;
      filesToProcess.push(file);
    }

    console.log("[CHAT] Preparing to send message", {
      model: selectedModel,
      filesQueued: filesToProcess.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        hasData: !!(file as any).data,
        hasUrl: !!(file as any).url,
      })),
    });

    // Clear input immediately to show user the message was received
    setInputValue("");
    setAttachedFiles([]);
    setSelectedFiles([]); // Clear selected files from UI

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Send message immediately - file processing will happen in useAiChat hook
    // The placeholder message will appear in UI while files are being processed
    await sendMessage(messageContent, filesToProcess);

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

    const files = Array.from(e.dataTransfer.files);
    const isOpenAI = selectedModel.startsWith("gpt-");

    if (files.length > 0) {
      setAttachedFiles([]);
      if (isOpenAI) {
        // OpenAI: accept all files
        setSelectedFiles(files);
      } else {
        // Others: only accept first file
        setSelectedFiles([files[0]]);
      }
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
              Drop {selectedModel.startsWith("gpt-") ? "files" : "a file"} here
              to upload
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Supports PDF, Word, Excel, and image files
            </p>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full h-full">
        {/* Header - Fixed at top */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 z-10">
          {/* Desktop layout - single row */}
          <div className="hidden xl:flex items-center justify-between p-4 gap-3">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="flex items-center space-x-2">
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

            <div className="flex items-center space-x-2 shrink-0">
              {/* Extended Thinking Toggle - Show only for Claude models */}
              {isClaudeModel && (
                <ExtendedThinkingToggle
                  enabled={extendedThinking}
                  onToggle={toggleExtendedThinking}
                  disabled={isLoading || isStreaming}
                />
              )}

              {/* Web Search Toggle - Show only for OpenAI models */}
              {isOpenAIModel && (
                <WebSearchToggle
                  enabled={webSearch}
                  onToggle={toggleWebSearch}
                  disabled={isLoading || isStreaming}
                />
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
                onModelChange={async (modelId: string) => {
                  // Only start a new conversation if the model is different
                  if (modelId !== selectedModel) {
                    // Prevent conversation loading from overriding the model change
                    setPreventModelOverride(true);

                    // Clear current conversation and URL - new conversation will be created when user sends first message
                    const url = new URL(window.location.href);
                    url.searchParams.delete("conversation");
                    window.history.pushState({}, "", url);

                    // Update local state immediately
                    setCurrentConversationId(null);
                    setConversationTitle("AI Assistant");

                    // Clear messages immediately to prevent any loaded conversation data from showing
                    setMessages([]);

                    // Change model and clear messages
                    changeModel(modelId);

                    // Reset the flag after a brief delay to allow the model change to take effect
                    setTimeout(() => setPreventModelOverride(false), 100);
                  }
                }}
                disabled={isLoading || isStreaming}
              />
            </div>
          </div>

          {/* Mobile/Tablet layout - two rows */}
          <div className="flex xl:hidden flex-col gap-3 p-4">
            {/* Top row: Title and Message Count */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Brain className="h-6 w-6 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
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
                      <div className="flex items-center gap-2 group min-w-0">
                        <h1 className="text-lg font-semibold truncate">
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
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {currentModel && (
                    <p className="text-sm text-muted-foreground truncate">
                      {currentModel.name}
                    </p>
                  )}
                </div>
              </div>

              {hasMessages && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {messages.length}
                </Badge>
              )}
            </div>

            {/* Bottom row: Model settings and controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Extended Thinking Toggle - Show only for Claude models */}
              {isClaudeModel && (
                <ExtendedThinkingToggle
                  enabled={extendedThinking}
                  onToggle={toggleExtendedThinking}
                  disabled={isLoading || isStreaming}
                />
              )}

              {/* Web Search Toggle - Show only for OpenAI models */}
              {isOpenAIModel && (
                <WebSearchToggle
                  enabled={webSearch}
                  onToggle={toggleWebSearch}
                  disabled={isLoading || isStreaming}
                />
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
                onModelChange={async (modelId: string) => {
                  // Only start a new conversation if the model is different
                  if (modelId !== selectedModel) {
                    // Prevent conversation loading from overriding the model change
                    setPreventModelOverride(true);

                    // Clear current conversation and URL - new conversation will be created when user sends first message
                    const url = new URL(window.location.href);
                    url.searchParams.delete("conversation");
                    window.history.pushState({}, "", url);

                    // Update local state immediately
                    setCurrentConversationId(null);
                    setConversationTitle("AI Assistant");

                    // Clear messages immediately to prevent any loaded conversation data from showing
                    setMessages([]);

                    // Change model and clear messages
                    changeModel(modelId);

                    // Reset the flag after a brief delay to allow the model change to take effect
                    setTimeout(() => setPreventModelOverride(false), 100);
                  }
                }}
                disabled={isLoading || isStreaming}
              />
            </div>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-hidden min-w-0 relative">
          <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
            <div className="p-4 space-y-4 pb-4 max-w-full min-h-full">
              {isLoadingConversation ? (
                <ChatHistorySkeleton messageCount={4} />
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Ask questions, upload{" "}
                      {selectedModel.startsWith("gpt-") ? "files" : "a file"}{" "}
                      for analysis using the paperclip button, or start typing
                      below
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Context Warning */}
                  <ContextWarning
                    messageCount={messages.length}
                    onStartNew={() => {
                      startNewConversation();
                      // Clear URL to indicate new conversation
                      const url = new URL(window.location.href);
                      url.searchParams.delete("conversation");
                      window.history.pushState({}, "", url);
                      setCurrentConversationId(null);
                      setConversationTitle("AI Assistant");
                    }}
                  />

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

                  {isProcessingFiles && (
                    <FileProcessingMessage progress={fileProcessingProgress} />
                  )}

                  {isLoading && !isStreaming && !isProcessingFiles && (
                    <TypingIndicator
                      status={webSearch ? "searching" : "thinking"}
                    />
                  )}

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
                    const isPDF = file.type === "application/pdf";
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
                        ) : isPDF ? (
                          <div className="h-8 w-8 rounded border border-border/50 bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-red-500" />
                          </div>
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
                    Will process when message is sent
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
                          const isOpenAI = selectedModel.startsWith("gpt-");

                          if (newFiles.length > 0) {
                            setAttachedFiles([]);
                            if (isOpenAI) {
                              // OpenAI: append all files
                              setSelectedFiles((prev) => [
                                ...prev,
                                ...newFiles,
                              ]);
                            } else {
                              // Others: only accept first file
                              setSelectedFiles([newFiles[0]]);
                            }
                          }
                          target.value = ""; // Reset input
                        }
                      };
                    }
                  }}
                  accept=".pdf,.doc,.docx,.pptx,.ppt,.txt,.rtf,.csv,.md,.xls,.xlsx,.xlsm,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
                  multiple={true}
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
                    className="border-0 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:ring-0 shadow-none px-3 min-h-[40px] max-h-[150px] resize-none overflow-y-auto"
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
