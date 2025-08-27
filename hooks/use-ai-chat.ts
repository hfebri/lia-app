"use client";

import { useState, useCallback, useRef } from "react";
import {
  ChatService,
  type ChatMessage,
  type StreamingChatResponse,
} from "@/lib/ai/chat-service";

interface UseAiChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  selectedModel: string;
  availableModels: any[];
}

interface UseAiChatOptions {
  initialModel?: string;
  maxMessages?: number;
  autoScroll?: boolean;
}

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
    streamingContent: "",
    error: null,
    selectedModel: initialModel,
    availableModels: [],
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
      console.error("Failed to load models:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load models",
      }));
    }
  }, []);

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

      // Create user message
      const userMessage = chatService.current.createMessage("user", content);

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage].slice(-maxMessages),
        isLoading: true,
        isStreaming: stream,
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
            files || [],
            { model: state.selectedModel }
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
            }
          }
        } else {
          // Handle non-streaming response
          const response = await chatService.current.sendMessage(
            allMessages,
            files || [],
            {
              model: state.selectedModel,
            }
          );

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
          }));
        }
      } catch (error) {
        console.error("Chat error:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to send message",
          isLoading: false,
          isStreaming: false,
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

  return {
    // State
    messages: state.messages,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    streamingContent: state.streamingContent,
    error: state.error,
    selectedModel: state.selectedModel,
    availableModels: state.availableModels,

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

    // Computed
    hasMessages: state.messages.length > 0,
    canSend: !state.isLoading && !state.isStreaming,
    currentModel: state.availableModels.find(
      (m) => m.id === state.selectedModel
    ),
  };
}
