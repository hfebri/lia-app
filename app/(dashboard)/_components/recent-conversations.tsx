"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

export function RecentConversations() {
  // Mock recent conversations data
  const recentConversations = [
    {
      id: "1",
      title: "Document Analysis Query",
      lastMessage: "Can you analyze this PDF for key insights?",
      time: "2 minutes ago",
      messageCount: 8,
      status: "active",
    },
    {
      id: "2",
      title: "Data Processing Help",
      lastMessage: "Thanks for explaining the data structure!",
      time: "1 hour ago",
      messageCount: 15,
      status: "completed",
    },
    {
      id: "3",
      title: "Code Review Discussion",
      lastMessage: "The implementation looks good overall...",
      time: "3 hours ago",
      messageCount: 22,
      status: "completed",
    },
    {
      id: "4",
      title: "Research Question",
      lastMessage: "What are the best practices for...",
      time: "Yesterday",
      messageCount: 6,
      status: "completed",
    },
    {
      id: "5",
      title: "Technical Support",
      lastMessage: "The error has been resolved successfully.",
      time: "2 days ago",
      messageCount: 12,
      status: "completed",
    },
  ];

  return (
    <div className="space-y-4">
      {recentConversations.map((conversation) => (
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
                variant={
                  conversation.status === "active" ? "default" : "secondary"
                }
                className="text-xs"
              >
                {conversation.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate mb-2">
              {conversation.lastMessage}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {conversation.time}
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
      ))}

      {recentConversations.length === 0 && (
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
