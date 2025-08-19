import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  conversations,
  messages,
  templates,
  files,
  analytics,
  dailyMetrics,
  userRoleEnum,
  messageRoleEnum,
} from "./schema";

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type UserRole = (typeof userRoleEnum.enumValues)[number];

// Conversation types
export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;

// Message types
export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;
export type MessageRole = (typeof messageRoleEnum.enumValues)[number];

// Template types
export type Template = InferSelectModel<typeof templates>;
export type NewTemplate = InferInsertModel<typeof templates>;

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
  messages: Message[];
  user: User;
  template?: Template;
};

export type ConversationWithLastMessage = Conversation & {
  lastMessage?: Message;
  messageCount: number;
};

export type UserWithStats = User & {
  conversationCount: number;
  messageCount: number;
  totalTokensUsed: number;
};

export type TemplateWithUsage = Template & {
  usageCount: number;
  creator?: User;
};

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
