import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  conversations,
  files,
  analytics,
  dailyMetrics,
  userRoleEnum,
} from "./schema";

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type UserRole = (typeof userRoleEnum.enumValues)[number];

// Conversation types
export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;

// Message types (now embedded in conversations)
export type MessageRole = "user" | "assistant" | "system";

export type Message = {
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  tokens?: Record<string, any>;
  createdAt: Date | string;
};

export type NewMessage = Omit<Message, "createdAt"> & {
  createdAt?: Date | string;
};

// Template types (commented out as schema doesn't exist yet)
// export type Template = InferSelectModel<typeof templates>;
// export type NewTemplate = InferInsertModel<typeof templates>;

// File types
export type File = InferSelectModel<typeof files>;
export type NewFile = InferInsertModel<typeof files>;

// Analytics types
export type Analytics = InferSelectModel<typeof analytics>;
export type NewAnalytics = InferInsertModel<typeof analytics>;
export type DailyMetrics = InferSelectModel<typeof dailyMetrics>;
export type NewDailyMetrics = InferInsertModel<typeof dailyMetrics>;

// Extended types for API responses
export type ConversationWithMessages = Conversation & {
  user: User;
  // template?: Template; // Commented out as schema doesn't exist yet
};

export type ConversationWithLastMessage = Conversation & {
  lastMessage?: Message;
  messageCount: number;
};

// Helper type to work with conversation messages
export type ConversationMessages = Message[];

export type UserWithStats = User & {
  conversationCount: number;
  messageCount: number;
  totalTokensUsed: number;
};

// export type TemplateWithUsage = Template & {
//   usageCount: number;
//   creator?: User;
// };

export type FileWithAnalysis = File & {
  user: User;
};

// Utility types
export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ErrorResponse = {
  success: false;
  message: string;
  error?: string;
};
