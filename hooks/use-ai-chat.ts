"use client";

import { useState, useCallback, useRef } from "react";
import {
  ChatService,
  type ChatMessage,
  type StreamingChatResponse,
} from "@/lib/ai/chat-service";
import type { ReasoningEffort } from "@/components/chat/reasoning-effort-selector";

interface UseAiChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  isProcessingFiles: boolean; // New state for file processing
  streamingContent: string;
  error: string | null;
  selectedModel: string;
  availableModels: any[];
  extendedThinking: boolean; // Claude-exclusive
  thinkingMode: boolean; // Gemini-exclusive
  reasoningEffort: ReasoningEffort;
  currentConversationId: string | null; // Track current conversation
  systemInstruction: string; // System instruction for conversation
}

interface UseAiChatOptions {
  initialModel?: string;
  maxMessages?: number;
  autoScroll?: boolean;
}

// Helper function to save chat messages to database
const saveChatToDatabase = async (
  userMessage: { content: string; metadata?: any },
  assistantMessage: { content: string; metadata?: any },
  conversationId?: string
) => {
  const response = await fetch("/api/chat/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      userMessage,
      assistantMessage,
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
  } = options;

  const [state, setState] = useState<UseAiChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    isProcessingFiles: false,
    streamingContent: "",
    error: null,
    selectedModel: initialModel,
    availableModels: [],
    extendedThinking: false,
    thinkingMode: false,
    reasoningEffort: "medium",
    currentConversationId: null,
    systemInstruction: "",
  });

  const chatService = useRef(ChatService.getInstance());
  const abortController = useRef<AbortController | null>(null);

  // Load available models
  const loadModels = useCallback(async () => {
    try {
      const modelsData = await chatService.current.getAvailableModels();
      setState((prev) => ({
        ...prev,
        availableModels: modelsData.models,
        selectedModel: prev.selectedModel || modelsData.defaultModel,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load models",
      }));
    }
  }, []);

  // Send a message with streaming response
  const sendMessage = useCallback(
    async (content: string, files?: File[], stream: boolean = true) => {
      // Log system instruction if present
      if (state.systemInstruction) {
        console.log("🎯 Using system instruction:", state.systemInstruction.substring(0, 50) + "...");
      }

      // Validate message
      const validation = chatService.current.validateMessage(content);
      if (!validation.isValid) {
        setState((prev) => ({
          ...prev,
          error: validation.error || "Invalid message",
        }));
        return;
      }

      // Create user message with files for all models
      let userMessage = chatService.current.createMessage("user", content);

      // If files are provided, convert them to base64 for all models
      if (files && files.length > 0) {
        const fileData = await Promise.all(
          files.map(async (file) => {
            // Check if file already has base64 data (from direct processing)
            if ((file as any).data) {
              return {
                name: file.name,
                type: (file as any).type || file.type,
                size: file.size,
                data: (file as any).data,
              };
            }

            // Otherwise, convert file to base64
            const arrayBuffer = await file.arrayBuffer();
            const base64Data = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ""
              )
            );
            return {
              name: file.name,
              type: file.type,
              size: file.size,
              data: base64Data,
            };
          })
        );

        // Add files to the user message for all models
        userMessage = {
          ...userMessage,
          files: fileData,
        };
      }

      // Check if we have files to process
      const hasFiles = files && files.length > 0;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage].slice(-maxMessages),
        isLoading: !hasFiles, // Don't show regular loading if we'll show file processing
        isProcessingFiles: !!hasFiles, // Show file processing animation if we have files
        isStreaming: stream && !hasFiles, // Only start streaming if no files to process first
        streamingContent: "",
        error: null,
      }));

      // Abort any ongoing request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      try {
        const allMessages = [...state.messages, userMessage];

        if (stream) {
          // Handle streaming response
          let accumulatedContent = "";
          let assistantMessageId = "";

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
            if (chunk.isComplete && accumulatedContent.trim()) {
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
                const result = await saveChatToDatabase(userMessage, assistantMessage, state.currentConversationId || undefined);
                // Update conversation ID if this was the first message
                if (result.success && !state.currentConversationId) {
                  setState((prev) => ({
                    ...prev,
                    currentConversationId: result.data.conversationId,
                  }));
                }
              } catch (error) {
                console.warn(
                  "Failed to save streaming chat to database:",
                  error
                );
                // Don't break the chat flow if database save fails
              }
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
            const result = await saveChatToDatabase(userMessage, assistantMessage, state.currentConversationId || undefined);
            // Update conversation ID if this was the first message
            if (result.success && !state.currentConversationId) {
              setState((prev) => ({
                ...prev,
                currentConversationId: result.data.conversationId,
              }));
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
    [state.messages, state.selectedModel, maxMessages]
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
  const changeModel = useCallback((modelId: string) => {
    setState((prev) => ({
      ...prev,
      selectedModel: modelId,
      // Reset extended thinking when switching models
      extendedThinking: false,
      // Reset thinking mode when switching models
      thinkingMode: false,
      // Reset reasoning effort when switching models
      reasoningEffort: "medium",
    }));
  }, []);

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
      error: null,
      streamingContent: "",
      systemInstruction: "", // Clear system instruction on new conversation
    }));
  }, []);

  // Set system instruction
  const setSystemInstruction = useCallback((instruction: string) => {
    setState((prev) => ({
      ...prev,
      systemInstruction: instruction,
    }));
  }, []);

  return {
    // State
    messages: state.messages,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    isProcessingFiles: state.isProcessingFiles,
    streamingContent: state.streamingContent,
    error: state.error,
    selectedModel: state.selectedModel,
    availableModels: state.availableModels,
    extendedThinking: state.extendedThinking,
    thinkingMode: state.thinkingMode,
    reasoningEffort: state.reasoningEffort,
    currentConversationId: state.currentConversationId,
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
    toggleExtendedThinking,
    toggleThinkingMode,
    setReasoningEffort,
    setSystemInstruction,

    // Computed
    hasMessages: state.messages.length > 0,
    canSend: !state.isLoading && !state.isStreaming,
    currentModel: state.availableModels.find(
      (m) => m.id === state.selectedModel
    ),
    isClaudeModel: state.selectedModel === "anthropic/claude-4-sonnet",
    isGeminiModel: state.selectedModel.includes("gemini"),
    isOpenAIModel: state.selectedModel.startsWith("openai/"),
  };
}
