import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Analytics table for tracking usage metrics
export const analytics = pgTable("analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventData: jsonb("event_data"),
  sessionId: varchar("session_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Daily usage metrics table
export const dailyMetrics = pgTable("daily_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  totalUsers: integer("total_users").default(0).notNull(),
  activeUsers: integer("active_users").default(0).notNull(),
  totalConversations: integer("total_conversations").default(0).notNull(),
  totalMessages: integer("total_messages").default(0).notNull(),
  totalTokensUsed: integer("total_tokens_used").default(0).notNull(),
  popularTopics: jsonb("popular_topics"),
  modelUsage: jsonb("model_usage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Analytics relations
export const analyticsRelations = relations(analytics, ({ one }) => ({
  user: one(users, {
    fields: [analytics.userId],
    references: [users.id],
  }),
}));
