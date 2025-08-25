"use client";

import { EnhancedChatInterface } from "@/components/chat/enhanced-chat-interface";

export default function ChatPage() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background md:pl-64 pt-14 md:pt-0">
      <EnhancedChatInterface />
    </div>
  );
}
