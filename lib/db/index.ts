// Export database connection and schema
export { db, schema } from "../../db/db";
export * from "../../db/types";

// Export all query functions
export * as userQueries from "./queries/users";
export * as conversationQueries from "./queries/conversations";
export * as messageQueries from "./queries/messages";
export * as fileQueries from "./queries/files";
export * as analyticsQueries from "./queries/analytics";

// Re-export commonly used functions for convenience
export {
  // User operations
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  getUsers,
} from "./queries/users";

export {
  // Conversation operations
  getConversationById,
  getConversationWithMessages,
  createConversation,
  updateConversation,
  deleteConversation,
  getConversationsByUserId,
} from "./queries/conversations";

export {
  // Message operations
  getMessageById,
  getMessagesByConversationId,
  createMessage,
  updateMessage,
  deleteMessage,
} from "./queries/messages";

export {
  // File operations
  getFileById,
  getFileWithUser,
  createFile,
  updateFile,
  getFilesByUserId,
} from "./queries/files";

export {
  // Analytics operations
  createAnalyticsEvent,
  getAnalyticsByUser,
  createOrUpdateDailyMetrics,
  getDailyMetricsByDate,
  trackUserSession,
} from "./queries/analytics";
