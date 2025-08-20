"use client";

import { useEffect } from "react";
import { useAiChat } from "@/hooks/use-ai-chat";
import { ModelSelector } from "./model-selector";
import { StreamingMessage } from "./streaming-message";
import { AIResponse } from "./ai-response";
import { MessageItem } from "./message-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Send,
  Square,
  MessageCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AiChatInterfaceProps {
  className?: string;
}

export function AiChatInterface({ className }: AiChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");

  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    selectedModel,
    availableModels,
    sendMessage,
    stopStreaming,
    changeModel,
    clearConversation,
    clearError,
    loadModels,
    hasMessages,
    canSend,
    currentModel,
  } = useAiChat();

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !canSend) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    await sendMessage(messageContent);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStopStreaming = () => {
    stopStreaming();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-4">
              <AlertCircle className="h-12 w-12 mx-auto mb-2" />
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
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with Model Selector */}
      <Card className="border-x-0 border-t-0 rounded-none">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Chat</CardTitle>
              </div>
              {hasMessages && (
                <Badge variant="secondary">{messages.length} messages</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Model Selector */}
              <ModelSelector
                models={availableModels}
                selectedModel={selectedModel}
                onModelChange={changeModel}
                disabled={isLoading || isStreaming}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={clearConversation}
                disabled={!hasMessages || isLoading || isStreaming}
              >
                Clear
              </Button>
            </div>
          </div>

          {currentModel && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Model: {currentModel.name}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Provider: {currentModel.provider}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Max tokens: {currentModel.maxTokens}</span>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {!hasMessages && !isStreaming ? (
          /* Welcome State */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                Start a conversation
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ask me anything! I'm powered by {currentModel?.name || "AI"} and
                ready to help.
              </p>
              {availableModels.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Choose your preferred model above to get started.
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Messages List */
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div key={message.id}>
                  {message.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                        <AIResponse
                          content={message.content}
                          model={message.model}
                          usage={message.usage}
                          timestamp={message.timestamp}
                          onRegenerate={() => {
                            // TODO: Implement regenerate
                          }}
                          onCopy={() => {
                            navigator.clipboard.writeText(message.content);
                          }}
                          onFeedback={(feedback) => {
                            // TODO: Implement feedback
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming Message */}
              {isStreaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                    <StreamingMessage
                      content={streamingContent}
                      isStreaming={isStreaming}
                      model={selectedModel}
                      onStop={handleStopStreaming}
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Input Area */}
        <div className="border-t bg-background p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    !hasMessages
                      ? "Ask me anything..."
                      : "Continue the conversation..."
                  }
                  disabled={isLoading || isStreaming}
                  className="pr-12"
                />

                {isLoading && !isStreaming && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {isStreaming ? (
                <Button
                  onClick={handleStopStreaming}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || !canSend}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Model info */}
            {currentModel && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Using {currentModel.name}</span>
                <Separator orientation="vertical" className="h-3" />
                <span>
                  ${currentModel.pricing.input.toFixed(3)}/
                  {currentModel.pricing.unit}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
