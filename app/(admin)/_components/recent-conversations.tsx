"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Clock, MessageSquare, ArrowRight, Edit2, Check, X, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RecentConversationsProps {
  data?: Array<{
    id: string;
    title: string;
    lastMessage: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  onRename?: (id: string, newTitle: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function RecentConversations({ data, onRename, onDelete }: RecentConversationsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const handleRename = async (id: string, newTitle: string) => {
    if (!newTitle.trim() || !onRename) {
      setEditingId(null);
      setTempTitle("");
      return;
    }

    try {
      await onRename(id, newTitle.trim());
      setEditingId(null);
      setTempTitle("");
    } catch (error) {
      console.error("Failed to rename conversation:", error);
      setEditingId(null);
      setTempTitle("");
    }
  };

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setTempTitle(currentTitle);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTempTitle("");
  };

  const handleKeyPress = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleRename(id, tempTitle);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  // Function to format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? "1 minute ago" : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return days === 1 ? "1 day ago" : `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.length > 0 ? (
        data.map((conversation) => (
          <div
            key={conversation.id}
            className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
          >
            <Avatar>
              <AvatarFallback>
                <MessageSquare className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {editingId === conversation.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, conversation.id)}
                      onBlur={() => handleRename(conversation.id, tempTitle)}
                      className="text-sm font-medium h-6 px-2 flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRename(conversation.id, tempTitle)}
                      className="h-6 w-6 p-0"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h4 className="font-medium truncate flex-1">{conversation.title}</h4>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {conversation.messageCount} msgs
                    </Badge>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate mb-2">
                {conversation.lastMessage}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getRelativeTime(conversation.updatedAt)}
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {conversation.messageCount} messages
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingId !== conversation.id && onRename && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditing(conversation.id, conversation.title)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              <span className="text-red-600">Delete</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{conversation.title}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(conversation.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <Button asChild variant="ghost" size="sm">
                <Link href={`/chat?conversation=${conversation.id}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-sm font-medium mb-2">No conversations yet</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Start your first conversation to see it here
          </p>
          <Button asChild size="sm">
            <Link href="/chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Chatting
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
