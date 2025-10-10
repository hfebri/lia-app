"use client";

import { useConversationsContext } from "@/components/providers/conversations-provider";

/**
 * Hook to access conversations data and actions.
 * This hook now consumes the ConversationsProvider context,
 * ensuring only ONE fetch happens regardless of how many
 * components use this hook.
 */
export function useConversations() {
  // Simply return the context - no more local state or fetching
  return useConversationsContext();
}
