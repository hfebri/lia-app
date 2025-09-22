"use client";

import { Conversation } from "@/lib/types/chat";
import { ConversationItem } from "./conversation-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId?: string;
  isLoading?: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onCreateNew?: () => void;
  className?: string;
}

export function ConversationList({
  conversations,
  currentConversationId,
  isLoading = false,
  onSelectConversation,
  onDeleteConversation,
  onCreateNew,
  className,
}: ConversationListProps) {
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations
          </CardTitle>
          {onCreateNew && (
            <Button
              onClick={onCreateNew}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {conversations.length === 0 && !isLoading ? (
          <div className="p-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-sm font-medium mb-2">No conversations yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Start your first conversation to see it here
            </p>
            {onCreateNew && (
              <Button onClick={onCreateNew} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            )}
          </div>
        ) : conversations.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-3">
              {sortedConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === currentConversationId}
                  onClick={() => onSelectConversation(conversation)}
                  onDelete={
                    onDeleteConversation
                      ? () => onDeleteConversation(conversation.id)
                      : undefined
                  }
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          /* Show skeleton when loading with no conversations */
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
