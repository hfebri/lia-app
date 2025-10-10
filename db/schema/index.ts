// Export all schemas
export * from "./users";
export * from "./conversations";
export * from "./files";
export * from "./analytics";

// Re-export all tables for easy importing
import { users, usersRelations } from "./users";
import {
  conversations,
  conversationsRelations,
} from "./conversations";
import { files, filesRelations } from "./files";
import { analytics, dailyMetrics, analyticsRelations } from "./analytics";

export const schema = {
  // Tables
  users,
  conversations,
  files,
  analytics,
  dailyMetrics,

  // Relations
  usersRelations,
  conversationsRelations,
  filesRelations,
  analyticsRelations,
};
