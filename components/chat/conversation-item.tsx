"use client";

import { useState } from "react";
import { Conversation } from "@/lib/types/chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, Clock, MoreHorizontal, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConversationItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onToggleFavorite?: () => void;
}

export function ConversationItem({
  conversation,
  isActive = false,
  onClick,
  onDelete,
  onRename,
  onToggleFavorite,
}: ConversationItemProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const formatDate = (date: Date) => {
    try {
      const now = new Date();
      const targetDate = new Date(date);

      if (isNaN(targetDate.getTime())) {
        return "Invalid date";
      }

      const diffInHours =
        (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        return "Just now";
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else if (diffInHours < 24 * 7) {
        return `${Math.floor(diffInHours / 24)}d ago`;
      } else {
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(targetDate);
      }
    } catch (error) {
      return "Unknown";
    }
  };

  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isActive && "bg-muted border border-border"
      )}
    >
      {/* Conversation Icon */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted-foreground/10 text-muted-foreground"
        )}
      >
        <MessageCircle className="h-4 w-4" />
      </div>

      {/* Conversation Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 min-w-0">
          <h4
            className={cn(
              "text-sm font-medium truncate flex-1",
              isActive ? "text-foreground" : "text-foreground/80"
            )}
          >
            {truncateTitle(conversation.title)}
            {conversation.isFavorite && (
              <Star
                className="ml-1 inline h-3 w-3 text-amber-500"
                fill="currentColor"
                strokeWidth={1.5}
                aria-label="Favorite conversation"
              />
            )}
          </h4>

          {conversation.messageCount > 0 && (
            <Badge variant="secondary" className="text-xs shrink-0 ml-2">
              {conversation.messageCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDate(conversation.updatedAt)}</span>

          {conversation.metadata?.template && (
            <Badge variant="outline" className="text-xs">
              Template
            </Badge>
          )}
        </div>

        {conversation.lastMessage && (
          <p className="text-xs text-muted-foreground/80 mt-1 truncate">
            {conversation.lastMessage.role === "user" ? "You: " : "AI: "}
            {conversation.lastMessage.content.substring(0, 50)}
            {conversation.lastMessage.content.length > 50 ? "..." : ""}
          </p>
        )}
      </div>

      {/* Actions Menu */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild onClick={handleMenuClick}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0 shrink-0 transition-all duration-200",
              "opacity-20 group-hover:opacity-100",
              "text-muted-foreground hover:text-foreground",
              isActive && "opacity-100"
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onToggleFavorite && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onToggleFavorite();
                setDropdownOpen(false);
              }}
            >
              <Star
                className={cn(
                  "mr-2 h-4 w-4",
                  conversation.isFavorite
                    ? "text-amber-500"
                    : "text-muted-foreground"
                )}
                fill={conversation.isFavorite ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
              {conversation.isFavorite ? "Remove Favorite" : "Add to Favorites"}
            </DropdownMenuItem>
          )}
          {onRename && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onRename();
                setDropdownOpen(false);
              }}
            >
              Rename
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onDelete();
                setDropdownOpen(false);
              }}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
