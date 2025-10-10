"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Conversation } from "@/lib/types/chat";
import { useAuth } from "@/hooks/use-auth";

interface ConversationsState {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

interface ConversationsContextType extends ConversationsState {
  loadConversations: (page?: number, search?: string) => Promise<void>;
  refreshConversations: (search?: string) => Promise<void>;
  loadMoreConversations: (search?: string) => Promise<void>;
  createConversation: (params?: {
    title?: string;
    initialMessage?: string;
    aiModel?: string;
  }) => Promise<Conversation | null>;
  updateConversation: (
    conversationId: string,
    updates: { title?: string; metadata?: any }
  ) => Promise<Conversation | null>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  searchConversations: (searchTerm: string) => Promise<void>;
  clearError: () => void;
}

const ConversationsContext = createContext<
  ConversationsContextType | undefined
>(undefined);

export function ConversationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [state, setState] = useState<ConversationsState>({
    conversations: [],
    isLoading: false,
    error: null,
    hasMore: true,
    currentPage: 1,
  });

  // Use ref to track if initial fetch has happened
  const hasFetchedRef = useRef(false);
  // AbortController ref to cancel requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track if a request is currently in progress
  const isRequestInProgressRef = useRef(false);

  // Load conversations with AbortController
  const loadConversations = useCallback(
    async (page = 1, search?: string) => {
      if (!user) return;

      // Cancel any pending request only if one is actually in progress
      if (isRequestInProgressRef.current && abortControllerRef.current) {
        console.log('🚫 Aborting previous request');
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      isRequestInProgressRef.current = true;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });

        if (search) {
          params.append("search", search);
        }

        console.log(`📡 Fetching conversations: page ${page}${search ? ` search="${search}"` : ''}`);

        const response = await fetch(`/api/conversations?${params}`, {
          signal: abortControllerRef.current.signal,
        });

        console.log(`✅ Conversations fetch successful: page ${page}`);

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

        isRequestInProgressRef.current = false;
      } catch (error: any) {
        // Ignore abort errors
        if (error.name === "AbortError") {
          console.log('⚠️ Request aborted (this is normal in dev mode)');
          isRequestInProgressRef.current = false;
          return;
        }

        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load conversations",
          isLoading: false,
        }));

        isRequestInProgressRef.current = false;
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
        initialMessage?: string;
        aiModel?: string;
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

  // Load conversations ONCE when user is available
  useEffect(() => {
    console.log('🔄 Effect running - user:', user?.email, 'hasFetched:', hasFetchedRef.current);

    if (user && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      console.log('🎯 Initial conversations load triggered for:', user.email);
      loadConversations();
    }

    // Don't add cleanup that aborts - let requests complete
    // Only abort if component truly unmounts (user logs out)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Memoize the context value
  const value = useMemo<ConversationsContextType>(
    () => ({
      ...state,
      loadConversations,
      refreshConversations,
      loadMoreConversations,
      createConversation,
      updateConversation,
      deleteConversation,
      searchConversations,
      clearError,
    }),
    [
      state,
      loadConversations,
      refreshConversations,
      loadMoreConversations,
      createConversation,
      updateConversation,
      deleteConversation,
      searchConversations,
      clearError,
    ]
  );

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversationsContext() {
  const context = useContext(ConversationsContext);
  if (context === undefined) {
    throw new Error(
      "useConversationsContext must be used within ConversationsProvider"
    );
  }
  return context;
}
