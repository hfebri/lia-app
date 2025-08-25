"use client";

import { EnhancedChatInterface } from "@/components/chat/enhanced-chat-interface";

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <EnhancedChatInterface />
    </div>
  );
}
