// Export all schemas
export * from "./users";
export * from "./conversations";
export * from "./templates";
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
import { templates, templatesRelations } from "./templates";
import { files, filesRelations } from "./files";
import { analytics, dailyMetrics, analyticsRelations } from "./analytics";

export const schema = {
  // Tables
  users,
  conversations,
  messages,
  templates,
  files,
  analytics,
  dailyMetrics,

  // Relations
  usersRelations,
  conversationsRelations,
  messagesRelations,
  templatesRelations,
  filesRelations,
  analyticsRelations,
};
