import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  date,
  boolean,
  index,
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

// User sessions table for real-time activity tracking
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  deviceType: varchar("device_type", { length: 50 }), // mobile, desktop, tablet
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_sessions_user_id_idx").on(table.userId),
  lastSeenAtIdx: index("user_sessions_last_seen_at_idx").on(table.lastSeenAt),
  userIdLastSeenIdx: index("user_sessions_user_id_last_seen_idx").on(table.userId, table.lastSeenAt),
  sessionIdIdx: index("user_sessions_session_id_idx").on(table.sessionId),
}));

// User sessions relations
export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

// Daily usage metrics table
export const dailyMetrics = pgTable("daily_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull().unique(), // Add unique constraint to prevent duplicates
  totalUsers: integer("total_users").default(0).notNull(),
  activeUsers: integer("active_users").default(0).notNull(), // Legacy field, keep for backward compatibility
  realTimeActiveUsers: integer("real_time_active_users").default(0).notNull(), // Last 15 mins
  dailyActiveUsers: integer("daily_active_users").default(0).notNull(), // DAU
  weeklyActiveUsers: integer("weekly_active_users").default(0).notNull(), // WAU
  monthlyActiveUsers: integer("monthly_active_users").default(0).notNull(), // MAU
  totalConversations: integer("total_conversations").default(0).notNull(),
  totalMessages: integer("total_messages").default(0).notNull(),
  totalTokensUsed: integer("total_tokens_used").default(0).notNull(),
  popularTopics: jsonb("popular_topics"),
  modelUsage: jsonb("model_usage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations - declared after all tables to avoid ReferenceError
export const analyticsRelations = relations(analytics, ({ one }) => ({
  user: one(users, {
    fields: [analytics.userId],
    references: [users.id],
  }),
  session: one(userSessions, {
    fields: [analytics.sessionId],
    references: [userSessions.sessionId],
  }),
}));
