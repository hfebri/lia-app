"use client";

import { useState, useCallback, useRef } from "react";
import {
  ChatService,
  type ChatMessage,
  type StreamingChatResponse,
} from "@/lib/ai/chat-service";
import type { ReasoningEffort } from "@/components/chat/reasoning-effort-selector";
import type { ProcessedFile, FileProcessingProgress } from "@/lib/services/client-file-processor";

interface UseAiChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  isProcessingFiles: boolean; // New state for file processing
  fileProcessingProgress: Record<string, FileProcessingProgress>; // Track OCR progress per file
  streamingContent: string;
  error: string | null;
  selectedModel: string;
  availableModels: any[];
  extendedThinking: boolean; // Claude-exclusive
  thinkingMode: boolean; // Gemini-exclusive
  reasoningEffort: ReasoningEffort;
  currentConversationId: string | null; // Track current conversation
  currentConversationModel: string | null; // Track model used in current conversation
  systemInstruction: string; // System instruction for conversation
}

interface UseAiChatOptions {
  initialModel?: string;
  maxMessages?: number;
  autoScroll?: boolean;
  onConversationCreated?: (conversationData: { id: string; title: string | null }) => void;
  preCreateConversation?: (params: { title: string; aiModel: string }) => Promise<{ id: string; title?: string | null } | null>;
}

// Helper function to save chat messages to database
const saveChatToDatabase = async (
  userMessage: { content: string; metadata?: any },
  assistantMessage: { content: string; metadata?: any },
  conversationId?: string,
  aiModel?: string
) => {
  const response = await fetch("/api/chat/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      userMessage,
      assistantMessage,
      aiModel, // Include AI model in the request
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save chat to database");
  }

  return response.json();
};

export function useAiChat(options: UseAiChatOptions = {}) {
  const {
    initialModel = "openai/gpt-5",
    maxMessages = 100,
    autoScroll = true,
    onConversationCreated,
    preCreateConversation,
  } = options;

  // Get saved model from localStorage or use initial model
  const getSavedModel = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lia-selectedModel") || initialModel;
    }
    return initialModel;
  };

  const [state, setState] = useState<UseAiChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    isProcessingFiles: false,
    fileProcessingProgress: {},
    streamingContent: "",
    error: null,
    selectedModel: getSavedModel(),
    availableModels: [],
    extendedThinking: false,
    thinkingMode: false,
    reasoningEffort: "medium",
    currentConversationId: null,
    currentConversationModel: null,
    systemInstruction: "",
  });

  const chatService = useRef(ChatService.getInstance());
  const abortController = useRef<AbortController | null>(null);

  const createConversationTitle = useCallback((message: string) => {
    const normalized = message.trim().replace(/\s+/g, " ");
    if (!normalized) {
      return "New Chat";
    }
    return normalized.length > 50
      ? `${normalized.slice(0, 47)}...`
      : normalized;
  }, []);

  // Load available models
  const loadModels = useCallback(async () => {
    try {
      const modelsData = await chatService.current.getAvailableModels();
      // Filter out Gemini models from the available models list
      const filteredModels = modelsData.models.filter(
        (model: any) => !model.id.toLowerCase().includes('gemini')
      );
      setState((prev) => ({
        ...prev,
        availableModels: filteredModels,
        selectedModel: prev.selectedModel || modelsData.defaultModel,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load models",
      }));
    }
  }, []);

  // Build file context from all previous messages in conversation
  const buildConversationFileContext = useCallback(() => {
    const allFiles = state.messages
      .filter((msg) => msg.role === "user" && msg.metadata?.files)
      .flatMap((msg) => msg.metadata!.files!);

    if (allFiles.length === 0) return "";

    const context = allFiles
      .map(
        (file, idx) =>
          `[File ${idx + 1}: ${file.name}${file.error ? " (Error)" : ""}]\n${
            file.extractedText || "No text extracted"
          }`
      )
      .join("\n\n---\n\n");

    return `\n\n[CONVERSATION CONTEXT - Available Files]\n${context}\n[END CONVERSATION CONTEXT]\n\n`;
  }, [state.messages]);

  // Check if a file has already been processed in this conversation
  const isFileAlreadyProcessed = useCallback(
    (file: File): boolean => {
      return state.messages.some(
        (msg) =>
          msg.metadata?.files?.some(
            (f) =>
              f.name === file.name &&
              f.size === file.size &&
              f.extractedText &&
              !f.error
          )
      );
    },
    [state.messages]
  );

  // Send a message with streaming response
  const sendMessage = useCallback(
    async (content: string, files?: File[], stream: boolean = true) => {
      // Validate message
      const validation = chatService.current.validateMessage(content);
      if (!validation.isValid) {
        setState((prev) => ({
          ...prev,
          error: validation.error || "Invalid message",
        }));
        return;
      }

      // Process files client-side FIRST before creating message
      let finalContent = content;
      let processedFiles: ProcessedFile[] = [];
      let conversationId = state.currentConversationId;
      let conversationPreCreated = false;
      let conversationTitle: string | null = null;

      if (!conversationId && preCreateConversation) {
        const draftTitle = createConversationTitle(content);
        try {
          const newConversation = await preCreateConversation({
            title: draftTitle,
            aiModel: state.selectedModel,
          });

          if (newConversation?.id) {
            conversationId = newConversation.id;
            conversationTitle = newConversation.title ?? draftTitle;
            conversationPreCreated = true;

            if (onConversationCreated) {
              onConversationCreated({
                id: newConversation.id,
                title: conversationTitle,
              });
            }
          }
        } catch (error) {
          console.warn("Failed to pre-create conversation:", error);
        }
      }

      const placeholderMessage = chatService.current.createMessage(
        "user",
        content
      );

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, placeholderMessage].slice(-maxMessages),
        currentConversationModel:
          prev.currentConversationModel || prev.selectedModel,
        isLoading: true,
        isProcessingFiles: !!(files && files.length > 0),
        fileProcessingProgress: {},
        isStreaming: false,
        streamingContent: "",
        error: null,
      }));

      // ALWAYS include file context if conversation has files (even without new uploads)
      const fileContext = buildConversationFileContext();
      if (fileContext && (!files || files.length === 0)) {
        // No new files, but conversation has files - include context
        finalContent = content + fileContext;
      }

      if (files && files.length > 0) {
        // Upload images with base64 data to Supabase to get URLs first
        const imageFilesWithData = files.filter(file =>
          file.type.startsWith('image/') &&
          !(file as any).url &&
          (file as any).data
        );

        if (imageFilesWithData.length > 0) {
          for (const file of imageFilesWithData) {
            try {
              // Convert base64 to Blob
              const base64Data = (file as any).data;
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: file.type });

              // Create FormData
              const formData = new FormData();
              formData.append('file', blob, file.name);

              // Upload to Supabase
              const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData,
              });

              const uploadResult = await uploadResponse.json();

              if (uploadResult.success) {
                (file as any).url = uploadResult.url;
                delete (file as any).data;
              } else {
                console.error("Failed to upload image:", uploadResult.error);
              }
            } catch (error) {
              console.error("Error uploading image:", error);
            }
          }
        }

        // Now separate files after upload
        const filesWithUrls = files.filter(file => (file as any).url);
        const filesWithData = files.filter(file => !(file as any).url && (file as any).data);
        const filesNeedingProcessing = files.filter(file => !(file as any).url && !(file as any).data && !isFileAlreadyProcessed(file));

        // Convert files with URLs to ProcessedFile format
        if (filesWithUrls.length > 0) {
          const filesFromUrls = filesWithUrls.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            url: (file as any).url,
            data: undefined,
            extractedText: "",
            isImage: file.type.startsWith("image/"),
            isDocument: false,
            isText: false,
            isSpreadsheet: false,
          }));
          processedFiles.push(...filesFromUrls);
        }

        // Convert files with base64 data to ProcessedFile format
        if (filesWithData.length > 0) {
          const filesFromData = filesWithData.map(file => {
            const base64Data = (file as any).data;
            return {
              name: file.name,
              type: file.type,
              size: file.size,
              url: undefined,
              data: base64Data,
              extractedText: "",
              isImage: file.type.startsWith("image/"),
              isDocument: false,
              isText: false,
              isSpreadsheet: false,
            };
          });
          processedFiles.push(...filesFromData);
        }

        // Filter out already-processed files
        const filesToProcess = filesNeedingProcessing;

        // Initialize progress for files that need processing
        const initialProgress: Record<string, any> = {};
        filesToProcess.forEach(file => {
          initialProgress[file.name] = {
            stage: "Initializing...",
            progress: 0,
            timeElapsed: 0,
          };
        });

        setState((prev) => ({
          ...prev,
          isProcessingFiles: filesToProcess.length > 0,
          fileProcessingProgress: initialProgress,
          error: null,
        }));


        try {
          // Dynamically import ClientFileProcessor to avoid SSR issues
          const { ClientFileProcessor } = await import("@/lib/services/client-file-processor");

          // Process only new files with progress tracking
          if (filesToProcess.length > 0) {
            processedFiles = await ClientFileProcessor.processFiles(
              filesToProcess,
              state.selectedModel, // Pass current model to determine if OCR is needed
              (fileName, progress) => {
                setState((prev) => ({
                  ...prev,
                  fileProcessingProgress: {
                    ...prev.fileProcessingProgress,
                    [fileName]: progress,
                  },
                }));
              }
            );
          }

          // Get conversation file context (from all previous messages)
          const fileContext = buildConversationFileContext();

          // Create enhanced prompt with:
          // 1. Conversation file context (all files from previous messages)
          // 2. New extracted text from newly uploaded files
          let enhancedContent = content;

          // Add conversation file context first (if any files exist in conversation)
          if (fileContext) {
            enhancedContent = content + fileContext;
          }

          // Then add newly processed files
          if (processedFiles.length > 0) {
            enhancedContent = ClientFileProcessor.createEnhancedPrompt(
              enhancedContent,
              processedFiles
            );
          }

          finalContent = enhancedContent;

          // Create display content (for user message in chat) - only new files
          const displayContent = processedFiles.length > 0
            ? ClientFileProcessor.createDisplayContent(processedFiles)
            : "";

          if (displayContent) {
            // Store the display content separately so we can show it in the user message
            (processedFiles as any).displayForMessage = `${content}\n\n${displayContent}`;
          }

        } catch (error) {
          console.error("File processing failed:", error);
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : "File processing failed",
            isProcessingFiles: false,
            fileProcessingProgress: {},
          }));
          return;
        }
      }

      // Create user message - use display content for UI
      const userMessageContent = (processedFiles as any).displayForMessage || content;
      const userMessage = chatService.current.createMessage("user", userMessageContent);

      // Add file metadata to user message
      if (processedFiles.length > 0) {
        const { ClientFileProcessor } = await import("@/lib/services/client-file-processor");
        userMessage.metadata = {
          files: ClientFileProcessor.toMetadata(processedFiles),
        };
      }

      // For AI processing, we need to use the enhanced content with extracted text
      const fileDataForAI = processedFiles
        .filter(f => f.url || f.data)
        .map(file => ({
          url: file.url,
          data: file.data,
          type: file.type,
          name: file.name,
          size: file.size,
        }));

      const messagesForAI = [
        ...state.messages,
        chatService.current.createMessage("user", finalContent, {
          files: fileDataForAI.length > 0 ? fileDataForAI as any : undefined
        })
      ].slice(-maxMessages);

      setState((prev) => ({
        ...prev,
        messages: prev.messages
          .map((msg) => (msg.id === placeholderMessage.id ? userMessage : msg))
          .slice(-maxMessages),
        currentConversationId: conversationId || prev.currentConversationId,
        currentConversationModel:
          prev.currentConversationModel || prev.selectedModel,
        isProcessingFiles: false,
        fileProcessingProgress: {},
      }));

      // Abort any ongoing request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      try {
        // Use messagesForAI which contains the enhanced prompt with extracted text
        const allMessages = messagesForAI;

        if (stream) {
          // Handle streaming response
          let accumulatedContent = "";

          const streamGenerator = chatService.current.sendStreamingMessage(
            allMessages,
            {
              model: state.selectedModel,
              extended_thinking: state.extendedThinking,
              thinking_mode: state.thinkingMode,
              reasoning_effort: state.reasoningEffort,
              systemInstruction: state.systemInstruction,
            }
          );

          for await (const chunk of streamGenerator) {
            if (abortController.current?.signal.aborted) {
              break;
            }

            accumulatedContent += chunk.content;

            setState((prev) => ({
              ...prev,
              streamingContent: accumulatedContent,
              isLoading: !chunk.isComplete,
              isStreaming: !chunk.isComplete,
              isProcessingFiles: false, // Files are done processing once streaming starts
            }));

            // Create or update assistant message when complete
            if (chunk.isComplete) {
              // Only create message if there's content
              if (accumulatedContent.trim()) {
                const assistantMessage = chatService.current.createMessage(
                  "assistant",
                  accumulatedContent,
                  {
                    model: state.selectedModel,
                    usage: chunk.usage,
                  }
                );

                setState((prev) => ({
                  ...prev,
                  messages: [...prev.messages, assistantMessage].slice(
                    -maxMessages
                  ),
                  streamingContent: "",
                  isLoading: false,
                  isStreaming: false,
                }));

                // Save both messages to database after streaming is complete
                try {
                  const result = await saveChatToDatabase(
                    userMessage,
                    assistantMessage,
                    conversationId || undefined,
                    state.selectedModel // Pass the selected AI model
                  );
                  // Update conversation ID if this was the first message
                  if (
                    result.success &&
                    !conversationId &&
                    result.data?.conversationId
                  ) {
                    conversationId = result.data.conversationId;
                    const persistedTitle = result.data.title || null;

                    setState((prev) => ({
                      ...prev,
                      currentConversationId: conversationId,
                    }));

                    if (onConversationCreated && !conversationPreCreated) {
                      onConversationCreated({
                        id: conversationId as string,
                        title: persistedTitle,
                      });
                    }
                  }
                } catch (error) {
                  console.warn(
                    "Failed to save streaming chat to database:",
                    error
                  );
                  // Don't break the chat flow if database save fails
                }
              } else {
                // Stream completed but no content - just clear the loading state
                setState((prev) => ({
                  ...prev,
                  streamingContent: "",
                  isLoading: false,
                  isStreaming: false,
                }));
              }
              break; // Exit loop when complete
            }
          }
        } else {
          // Handle non-streaming response
          const response = await chatService.current.sendMessage(allMessages, {
            model: state.selectedModel,
            extended_thinking: state.extendedThinking,
            thinking_mode: state.thinkingMode,
            reasoning_effort: state.reasoningEffort,
          });

          const assistantMessage = chatService.current.createMessage(
            "assistant",
            response.content,
            {
              model: response.model,
              usage: response.usage,
            }
          );

          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, assistantMessage].slice(-maxMessages),
            isLoading: false,
            isProcessingFiles: false, // Ensure file processing state is cleared
          }));

          // Save both messages to database after AI response is received
          try {
            const result = await saveChatToDatabase(
              userMessage,
              assistantMessage,
              conversationId || undefined,
              state.selectedModel // Pass the selected AI model
            );
            // Update conversation ID if this was the first message
            if (
              result.success &&
              !conversationId &&
              result.data?.conversationId
            ) {
              conversationId = result.data.conversationId;
              const persistedTitle = result.data.title || null;

              setState((prev) => ({
                ...prev,
                currentConversationId: conversationId,
              }));

              if (onConversationCreated && !conversationPreCreated) {
                onConversationCreated({
                  id: conversationId as string,
                  title: persistedTitle,
                });
              }
            }
          } catch (error) {
            console.warn("Failed to save chat to database:", error);
            // Don't break the chat flow if database save fails
          }
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to send message",
          isLoading: false,
          isStreaming: false,
          isProcessingFiles: false, // Clear file processing state on error
          streamingContent: "",
        }));
      }
    },
    [
      state.messages,
      state.selectedModel,
      state.systemInstruction,
      state.extendedThinking,
      state.thinkingMode,
      state.reasoningEffort,
      state.currentConversationId,
      maxMessages,
      onConversationCreated,
      preCreateConversation,
      createConversationTitle,
      buildConversationFileContext,
      isFileAlreadyProcessed,
    ]
  );

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
      streamingContent: "",
    }));
  }, []);

  // Change selected model
  const changeModel = useCallback(
    (modelId: string, onConversationCleared?: () => void) => {
      // If changing to a different model, always start new conversation
      const isDifferentModel = state.selectedModel !== modelId;

      if (isDifferentModel) {
        // Save selected model to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("lia-selectedModel", modelId);
        }

        // First, call the callback to notify that conversation will be cleared
        // This ensures URL changes happen before state updates
        if (onConversationCleared) {
          onConversationCleared();
        }

        // Then update the state to clear conversation and set new model
        setState((prev) => ({
          ...prev,
          selectedModel: modelId,
          messages: [],
          currentConversationId: null, // Always clear conversation ID on model change
          currentConversationModel: modelId, // Set the new conversation model
          error: null,
          streamingContent: "",
          systemInstruction: "", // Clear system instruction on model change
          // Reset model-specific settings when switching models
          extendedThinking: false,
          thinkingMode: false,
          reasoningEffort: "medium",
        }));
      } else {
        // If same model, just update the model-specific settings
        setState((prev) => ({
          ...prev,
          selectedModel: modelId,
          currentConversationModel: prev.currentConversationModel || modelId, // Set if not set
          // Reset model-specific settings when switching models
          extendedThinking: false,
          thinkingMode: false,
          reasoningEffort: "medium",
        }));
      }
    },
    [state.selectedModel]
  );

  // Toggle extended thinking
  const toggleExtendedThinking = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      extendedThinking: enabled,
    }));
  }, []);

  // Toggle thinking mode (Gemini)
  const toggleThinkingMode = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      thinkingMode: enabled,
    }));
  }, []);

  // Set reasoning effort
  const setReasoningEffort = useCallback((effort: ReasoningEffort) => {
    setState((prev) => ({
      ...prev,
      reasoningEffort: effort,
    }));
  }, []);

  // Add a system message
  const addSystemMessage = useCallback(
    (content: string) => {
      const systemMessage = chatService.current.createMessage(
        "system",
        content
      );
      setState((prev) => ({
        ...prev,
        messages: [systemMessage, ...prev.messages].slice(-maxMessages),
      }));
    },
    [maxMessages]
  );

  // Remove a message
  const removeMessage = useCallback((messageId: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== messageId),
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Regenerate last response
  const regenerateResponse = useCallback(async () => {
    const userMessages = state.messages.filter((msg) => msg.role === "user");
    if (userMessages.length === 0) return;

    const lastUserMessage = userMessages[userMessages.length - 1];

    // Remove the last assistant message if it exists
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter(
        (msg) =>
          !(
            msg.role === "assistant" &&
            prev.messages.indexOf(msg) === prev.messages.length - 1
          )
      ),
    }));

    // Resend the last user message
    await sendMessage(lastUserMessage.content);
  }, [state.messages, sendMessage]);

  // Set messages directly (for loading conversations)
  const setMessages = useCallback(
    (messages: ChatMessage[]) => {
      setState((prev) => ({
        ...prev,
        messages: messages.slice(-maxMessages),
        error: null,
        streamingContent: "",
      }));
    },
    [maxMessages]
  );

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: [],
      currentConversationId: null,
      currentConversationModel: null, // Reset conversation model
      error: null,
      streamingContent: "",
      systemInstruction: "", // Clear system instruction on new conversation
    }));
  }, []);

  // Set conversation ID (for loading existing conversations)
  const setConversationId = useCallback((conversationId: string | null) => {
    setState((prev) => ({
      ...prev,
      currentConversationId: conversationId,
    }));
  }, []);

  // Set system instruction
  const setSystemInstruction = useCallback((instruction: string) => {
    setState((prev) => ({
      ...prev,
      systemInstruction: instruction,
    }));
  }, []);

  // Set model for an existing conversation without clearing messages
  // This is specifically for loading existing conversations
  const setConversationModel = useCallback((modelId: string) => {
    setState((prev) => ({
      ...prev,
      selectedModel: modelId,
      currentConversationModel: modelId,
      // Reset model-specific settings when switching models
      extendedThinking: false,
      thinkingMode: false,
      reasoningEffort: "medium",
    }));
  }, []);

  return {
    // State
    messages: state.messages,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    isProcessingFiles: state.isProcessingFiles,
    fileProcessingProgress: state.fileProcessingProgress,
    streamingContent: state.streamingContent,
    error: state.error,
    selectedModel: state.selectedModel,
    availableModels: state.availableModels,
    extendedThinking: state.extendedThinking,
    thinkingMode: state.thinkingMode,
    reasoningEffort: state.reasoningEffort,
    currentConversationId: state.currentConversationId,
    currentConversationModel: state.currentConversationModel,
    systemInstruction: state.systemInstruction,

    // Actions
    sendMessage,
    stopStreaming,
    changeModel,
    addSystemMessage,
    removeMessage,
    clearError,
    regenerateResponse,
    loadModels,
    setMessages,
    startNewConversation,
    setConversationId,
    toggleExtendedThinking,
    toggleThinkingMode,
    setReasoningEffort,
    setSystemInstruction,
    setConversationModel,

    // Computed
    hasMessages: state.messages.length > 0,
    canSend: !state.isLoading && !state.isStreaming,
    currentModel: state.availableModels.find(
      (m) => m.id === state.selectedModel
    ),
    isClaudeModel:
      state.availableModels.find(m => m.id === state.selectedModel)?.capabilities?.includes("extended-thinking") || false,
    isGeminiModel: state.selectedModel.includes("gemini"),
    isOpenAIModel: state.selectedModel.startsWith("openai/"),
  };
}
