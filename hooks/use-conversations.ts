"use client";

import { useState, useCallback, useEffect } from "react";
import { Conversation } from "@/lib/types/chat";
import { useUser } from "@/hooks/use-user";

interface ConversationsState {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

const initialState: ConversationsState = {
  conversations: [],
  isLoading: false,
  error: null,
  hasMore: true,
  currentPage: 1,
};

export function useConversations() {
  const [state, setState] = useState<ConversationsState>(initialState);
  const { user } = useUser();

  // Load conversations
  const loadConversations = useCallback(
    async (page = 1, search?: string) => {
      if (!user) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });

        if (search) {
          params.append("search", search);
        }

        const response = await fetch(`/api/conversations?${params}`);
        if (!response.ok) throw new Error("Failed to load conversations");

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to load conversations");
        }

        setState((prev) => ({
          ...prev,
          conversations:
            page === 1 ? result.data : [...prev.conversations, ...result.data],
          isLoading: false,
          hasMore: result.pagination.page < result.pagination.totalPages,
          currentPage: result.pagination.page,
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
    },
    [user]
  );

  // Refresh conversations (reload from the beginning)
  const refreshConversations = useCallback(
    async (search?: string) => {
      setState((prev) => ({ ...prev, currentPage: 1, hasMore: true }));
      await loadConversations(1, search);
    },
    [loadConversations]
  );

  // Load more conversations (for pagination)
  const loadMoreConversations = useCallback(
    async (search?: string) => {
      if (state.isLoading || !state.hasMore) return;
      await loadConversations(state.currentPage + 1, search);
    },
    [state.isLoading, state.hasMore, state.currentPage, loadConversations]
  );

  // Create a new conversation
  const createConversation = useCallback(
    async (
      params: {
        title?: string;
        templateId?: string;
        initialMessage?: string;
      } = {}
    ) => {
      if (!user) return null;

      setState((prev) => ({ ...prev, error: null }));

      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!response.ok) throw new Error("Failed to create conversation");

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to create conversation");
        }

        const newConversation = result.data;

        setState((prev) => ({
          ...prev,
          conversations: [newConversation, ...prev.conversations],
        }));

        return newConversation;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create conversation",
        }));
        return null;
      }
    },
    [user]
  );

  // Update conversation
  const updateConversation = useCallback(
    async (
      conversationId: string,
      updates: { title?: string; metadata?: any }
    ) => {
      setState((prev) => ({ ...prev, error: null }));

      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error("Failed to update conversation");

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to update conversation");
        }

        const updatedConversation = result.data;

        setState((prev) => ({
          ...prev,
          conversations: prev.conversations.map((conv) =>
            conv.id === conversationId ? updatedConversation : conv
          ),
        }));

        return updatedConversation;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update conversation",
        }));
        return null;
      }
    },
    []
  );

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    setState((prev) => ({ ...prev, error: null }));

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete conversation");

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to delete conversation");
      }

      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.filter(
          (conv) => conv.id !== conversationId
        ),
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete conversation",
      }));
      return false;
    }
  }, []);

  // Search conversations
  const searchConversations = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        return refreshConversations();
      }
      return refreshConversations(searchTerm);
    },
    [refreshConversations]
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    ...state,
    loadConversations,
    refreshConversations,
    loadMoreConversations,
    createConversation,
    updateConversation,
    deleteConversation,
    searchConversations,
    clearError,
  };
}
