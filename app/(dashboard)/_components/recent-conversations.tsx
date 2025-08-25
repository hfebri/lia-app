"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

interface RecentConversationsProps {
  data?: Array<{
    id: string;
    title: string;
    lastMessage: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export function RecentConversations({ data }: RecentConversationsProps) {
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
            className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <Avatar>
              <AvatarFallback>
                <MessageSquare className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{conversation.title}</h4>
                <Badge
                  variant="secondary"
                  className="text-xs"
                >
                  {conversation.messageCount} msgs
                </Badge>
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

            <Button asChild variant="ghost" size="sm">
              <Link href={`/chat?conversation=${conversation.id}`}>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
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
