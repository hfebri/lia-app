// Export all schemas
export * from "./users";
export * from "./conversations";
export * from "./files";
export * from "./analytics";

// Re-export all tables for easy importing
import { users, usersRelations } from "./users";
import {
  conversations,
  messages,
  conversationsRelations,
  messagesRelations,
} from "./conversations";
import { files, filesRelations } from "./files";
import { analytics, dailyMetrics, analyticsRelations } from "./analytics";

export const schema = {
  // Tables
  users,
  conversations,
  messages,
  files,
  analytics,
  dailyMetrics,

  // Relations
  usersRelations,
  conversationsRelations,
  messagesRelations,
  filesRelations,
  analyticsRelations,
};
