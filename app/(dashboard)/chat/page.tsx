"use client";

import { ChatInterface } from "@/components/chat/chat-interface";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <div className="h-full">
        <ChatInterface />
      </div>
    </ProtectedRoute>
  );
}
