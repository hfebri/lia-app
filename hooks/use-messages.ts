"use client";

import { useState, useCallback, useEffect } from "react";
import { Message } from "@/lib/types/chat";
import { useUser } from "@/hooks/use-user";

interface MessagesState {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

const initialState: MessagesState = {
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  hasMore: true,
  currentPage: 1,
};

export function useMessages(conversationId?: string) {
  const [state, setState] = useState<MessagesState>(initialState);
  const { user } = useUser();

  // Reset state when conversation changes
  useEffect(() => {
    setState(initialState);
  }, [conversationId]);

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (page = 1) => {
      if (!user || !conversationId) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "50",
        });

        const response = await fetch(
          `/api/conversations/${conversationId}/messages?${params}`
        );
        if (!response.ok) throw new Error("Failed to load messages");

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to load messages");
        }

        setState((prev) => ({
          ...prev,
          messages:
            page === 1 ? result.data : [...result.data, ...prev.messages],
          isLoading: false,
          hasMore: result.pagination.page < result.pagination.totalPages,
          currentPage: result.pagination.page,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to load messages",
          isLoading: false,
        }));
      }
    },
    [user, conversationId]
  );

  // Refresh messages (reload from the beginning)
  const refreshMessages = useCallback(async () => {
    setState((prev) => ({ ...prev, currentPage: 1, hasMore: true }));
    await loadMessages(1);
  }, [loadMessages]);

  // Load more messages (for pagination - older messages)
  const loadMoreMessages = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;
    await loadMessages(state.currentPage + 1);
  }, [state.isLoading, state.hasMore, state.currentPage, loadMessages]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string, model?: string) => {
      if (!user || !conversationId) return null;

      setState((prev) => ({ ...prev, isSending: true, error: null }));

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, model }),
          }
        );

        if (!response.ok) throw new Error("Failed to send message");

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to send message");
        }

        const { userMessage, assistantMessage } = result.data;

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, userMessage, assistantMessage],
          isSending: false,
        }));

        return { userMessage, assistantMessage };
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to send message",
          isSending: false,
        }));
        return null;
      }
    },
    [user, conversationId]
  );

  // Add message to local state (for optimistic updates)
  const addMessageOptimistically = useCallback((message: Message) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  // Update message in local state
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      }));
    },
    []
  );

  // Remove message from local state
  const removeMessage = useCallback((messageId: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== messageId),
    }));
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: [],
      currentPage: 1,
      hasMore: true,
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId && user) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user]);

  return {
    ...state,
    loadMessages,
    refreshMessages,
    loadMoreMessages,
    sendMessage,
    addMessageOptimistically,
    updateMessage,
    removeMessage,
    clearMessages,
    clearError,
  };
}
