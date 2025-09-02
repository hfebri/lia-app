"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface NewConversationButtonProps {
  onCreateConversation: (params: {
    title?: string;
    templateId?: string;
    initialMessage?: string;
  }) => Promise<any>;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  showLabel?: boolean;
  disabled?: boolean;
}

export function NewConversationButton({
  onCreateConversation,
  variant = "default",
  size = "default",
  className,
  showLabel = true,
  disabled = false,
}: NewConversationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [initialMessage, setInitialMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);

    try {
      const params: any = {};
      if (title.trim()) params.title = title.trim();
      if (initialMessage.trim()) params.initialMessage = initialMessage.trim();

      await onCreateConversation(params);

      // Reset form and close dialog
      setTitle("");
      setInitialMessage("");
      setIsOpen(false);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCreate = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onCreateConversation({});
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex gap-2">
        {/* Quick create button */}
        <Button
          onClick={handleQuickCreate}
          variant={variant}
          size={size}
          disabled={disabled || isLoading}
          className={cn(className)}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {showLabel && (
            <span className="ml-2">
              {isLoading ? "Creating..." : "New Chat"}
            </span>
          )}
        </Button>

        {/* Advanced create button */}
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size={size}
            disabled={disabled}
            className="px-2"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Conversation</DialogTitle>
          <DialogDescription>
            Start a new conversation with optional title and initial message.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your conversation a title..."
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Initial Message (optional)</Label>
            <Textarea
              id="message"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Start the conversation with a message..."
              disabled={isLoading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
