export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  conversationId: string;
  metadata?: {
    model?: string;
    tokens?: number;
    finish_reason?: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  messageCount: number;
  lastMessage?: Message;
  metadata?: {
    template?: string;
    model?: string;
  };
}

export interface ChatState {
  currentConversation: Conversation | null;
  messages: Message[];
  conversations: Conversation[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

export interface SendMessageParams {
  content: string;
  conversationId?: string;
  model?: string;
}

export interface CreateConversationParams {
  title?: string;
  templateId?: string;
  initialMessage?: string;
}

export type MessageRole = "user" | "assistant";

export interface StreamingMessage {
  id: string;
  content: string;
  role: MessageRole;
  isStreaming: boolean;
  timestamp: Date;
}
