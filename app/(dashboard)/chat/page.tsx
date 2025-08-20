"use client";

import { EnhancedChatInterface } from "@/components/chat/enhanced-chat-interface";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <div className="h-full">
        <EnhancedChatInterface />
      </div>
    </ProtectedRoute>
  );
}
