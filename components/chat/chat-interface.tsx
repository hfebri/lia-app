"use client";

import { useChat } from "@/hooks/use-chat";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ConversationList } from "./conversation-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Plus, Settings, Brain } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const {
    currentConversation,
    messages,
    conversations,
    isLoading,
    isStreaming,
    error,
    selectConversation,
    createConversation,
    sendMessage,
    deleteConversation,
    clearError,
  } = useChat();

  const isMobile = useIsMobile();

  const handleSendMessage = (content: string) => {
    sendMessage({ content });
  };

  const handleNewConversation = async () => {
    await createConversation();
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteConversation(conversationId);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-4">
              <MessageCircle className="h-12 w-12 mx-auto mb-2" />
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

  return (
    <div className={cn("flex h-full", className)}>
      {/* Sidebar - Conversation List */}
      {!isMobile && (
        <div className="w-80 border-r border-border flex flex-col">
          <ConversationList
            conversations={conversations}
            currentConversationId={currentConversation?.id}
            isLoading={isLoading && conversations.length === 0}
            onSelectConversation={selectConversation}
            onDeleteConversation={handleDeleteConversation}
            onCreateNew={handleNewConversation}
            className="border-0 h-full"
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <Card className="border-x-0 border-t-0 rounded-none">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    {currentConversation
                      ? currentConversation.title
                      : "New Chat"}
                  </CardTitle>
                </div>

                {currentConversation?.metadata?.template && (
                  <Badge variant="secondary">Template</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isMobile && (
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewConversation}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>

                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {currentConversation && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{messages.length} messages</span>
                <Separator orientation="vertical" className="h-4" />
                <span>
                  Updated{" "}
                  {(() => {
                    try {
                      const date = new Date(currentConversation.updatedAt);
                      if (isNaN(date.getTime())) {
                        return "Invalid date";
                      }
                      return new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(date);
                    } catch (error) {
                        "Date formatting error:",
                        error,
                        currentConversation.updatedAt
                      );
                      return "Unknown";
                    }
                  })()}
                </span>
                {currentConversation.metadata?.model && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <Badge variant="outline" className="text-xs">
                      {currentConversation.metadata.model}
                    </Badge>
                  </>
                )}
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            isStreaming={isStreaming}
          />

          {/* Chat Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isStreaming={isStreaming}
            placeholder={
              currentConversation
                ? "Continue the conversation..."
                : "Start a new conversation..."
            }
          />
        </div>
      </div>
    </div>
  );
}
