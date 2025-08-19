"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChatState,
  Message,
  Conversation,
  SendMessageParams,
  CreateConversationParams,
} from "@/lib/types/chat";
import { useUser } from "@/hooks/use-user";

const initialState: ChatState = {
  currentConversation: null,
  messages: [],
  conversations: [],
  isLoading: false,
  isStreaming: false,
  error: null,
};

export function useChat() {
  const [state, setState] = useState<ChatState>(initialState);
  const { user } = useUser();

  // TEMPORARY: Mock user for testing when authentication is disabled
  const mockUser = {
    id: "12345678-1234-1234-1234-123456789abc",
    email: "test@example.com",
    name: "Test User",
  };

  const currentUser = user || mockUser;

  // Load conversations for the current user
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/conversations");
      if (!response.ok) throw new Error("Failed to load conversations");

      const result = await response.json();
      setState((prev) => ({
        ...prev,
        conversations: result.data || [],
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load conversations",
        isLoading: false,
      }));
    }
  }, [currentUser]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`
      );
      if (!response.ok) throw new Error("Failed to load messages");

      const messages = await response.json();
      setState((prev) => ({ ...prev, messages, isLoading: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to load messages",
        isLoading: false,
      }));
    }
  }, []);

  // Select a conversation and load its messages
  const selectConversation = useCallback(
    async (conversation: Conversation) => {
      setState((prev) => ({ ...prev, currentConversation: conversation }));
      await loadMessages(conversation.id);
    },
    [loadMessages]
  );

  // Create a new conversation
  const createConversation = useCallback(
    async (params: CreateConversationParams = {}) => {
      if (!currentUser) return null;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!response.ok) throw new Error("Failed to create conversation");

        const newConversation = await response.json();
        setState((prev) => ({
          ...prev,
          conversations: [newConversation, ...prev.conversations],
          currentConversation: newConversation,
          messages: [],
          isLoading: false,
        }));

        return newConversation;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create conversation",
          isLoading: false,
        }));
        return null;
      }
    },
    [currentUser]
  );

  // Send a message
  const sendMessage = useCallback(
    async (params: SendMessageParams) => {
      if (!currentUser) return;

      let conversationId = params.conversationId;

      // Create new conversation if none exists
      if (!conversationId && !state.currentConversation) {
        const newConversation = await createConversation();
        if (!newConversation) return;
        conversationId = newConversation.id;
      } else if (!conversationId && state.currentConversation) {
        conversationId = state.currentConversation.id;
      }

      if (!conversationId) return;

      // Add user message immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        content: params.content,
        role: "user",
        timestamp: new Date(),
        conversationId,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isStreaming: true,
        error: null,
      }));

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: params.content,
              model: params.model,
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to send message");

        // Handle streaming response (for future AI integration)
        const data = await response.json();

        setState((prev) => {
          const updatedMessages = prev.messages.filter(
            (m) => m.id !== userMessage.id
          );
          return {
            ...prev,
            messages: [
              ...updatedMessages,
              data.userMessage,
              data.assistantMessage,
            ],
            isStreaming: false,
          };
        });

        // Refresh conversations to update last message
        loadConversations();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to send message",
          isStreaming: false,
        }));
      }
    },
    [
      currentUser,
      state.currentConversation,
      createConversation,
      loadConversations,
    ]
  );

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete conversation");

      setState((prev) => {
        const updatedConversations = prev.conversations.filter(
          (c) => c.id !== conversationId
        );
        const isCurrentConversation =
          prev.currentConversation?.id === conversationId;

        return {
          ...prev,
          conversations: updatedConversations,
          currentConversation: isCurrentConversation
            ? null
            : prev.currentConversation,
          messages: isCurrentConversation ? [] : prev.messages,
          isLoading: false,
        };
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete conversation",
        isLoading: false,
      }));
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  return {
    ...state,
    loadConversations,
    loadMessages,
    selectConversation,
    createConversation,
    sendMessage,
    deleteConversation,
    clearError,
  };
}
