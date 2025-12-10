import {
  pgTable,
  timestamp,
  integer,
  real,
  jsonb,
  uuid,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * User Productivity Metrics
 *
 * Tracks individual user productivity and efficiency metrics over time.
 * Privacy-first: only metadata is tracked, no message content.
 *
 * Metrics Categories:
 * 1. Activity Metrics - Volume and frequency of usage
 * 2. Engagement Quality - Depth and complexity of interactions
 * 3. Efficiency Metrics - Speed and patterns of work
 * 4. Value Creation - Indicators of productive outcomes
 * 5. Productivity Score - Composite score (0-100)
 */
export const userProductivityMetrics = pgTable(
  "user_productivity_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Time period for these metrics
    periodType: varchar("period_type", { length: 10 }).notNull(), // 'day', 'week', 'month'
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

    // === ACTIVITY METRICS ===
    totalConversations: integer("total_conversations").notNull().default(0),
    totalMessages: integer("total_messages").notNull().default(0),
    totalUserMessages: integer("total_user_messages").notNull().default(0),
    totalAiMessages: integer("total_ai_messages").notNull().default(0),
    totalFilesProcessed: integer("total_files_processed").notNull().default(0),
    activeDays: integer("active_days").notNull().default(0),
    totalSessions: integer("total_sessions").notNull().default(0),

    // === ENGAGEMENT QUALITY METRICS ===
    avgConversationLength: real("avg_conversation_length").notNull().default(0), // messages per conversation
    avgIterationDepth: real("avg_iteration_depth").notNull().default(0), // back-and-forth exchanges
    complexityScore: real("complexity_score").notNull().default(0), // 0-100, based on message length, file usage, etc.
    conversationDiversity: real("conversation_diversity").notNull().default(0), // 0-100, topic variety

    // === EFFICIENCY METRICS ===
    avgTimeToFirstMessage: integer("avg_time_to_first_message").default(0), // seconds from conversation start
    avgTimeBetweenMessages: integer("avg_time_between_messages").default(0), // seconds
    avgSessionDuration: integer("avg_session_duration").default(0), // seconds
    peakActivityHour: integer("peak_activity_hour").default(0), // 0-23

    // === VALUE CREATION INDICATORS ===
    tokenEfficiency: real("token_efficiency").notNull().default(0), // messages per token (normalized)
    avgMessagesPerConversation: real("avg_messages_per_conversation")
      .notNull()
      .default(0),
    fileProcessingRate: real("file_processing_rate").notNull().default(0), // files per session
    conversationCompletionRate: real("conversation_completion_rate")
      .notNull()
      .default(0), // % conversations with >3 exchanges
    favoriteConversations: integer("favorite_conversations").notNull().default(0),

    // === COMPOSITE SCORE ===
    productivityScore: real("productivity_score").notNull().default(0), // 0-100, weighted composite

    // === DETAILED BREAKDOWNS (JSON) ===
    activityByDayOfWeek: jsonb("activity_by_day_of_week").$type<{
      [key: string]: number;
    }>(), // { "monday": 5, "tuesday": 3, ... }
    activityByHour: jsonb("activity_by_hour").$type<{ [key: string]: number }>(), // { "9": 12, "14": 8, ... }
    topicBreakdown: jsonb("topic_breakdown").$type<{
      [key: string]: number;
    }>(), // { "code": 45, "analysis": 30, ... }
    modelUsage: jsonb("model_usage").$type<{ [key: string]: number }>(), // { "gpt-4": 20, "claude": 15, ... }

    // === METADATA ===
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => {
    return {
      // Index for fast user lookups
      userIdIdx: index("productivity_metrics_user_id_idx").on(table.userId),
      // Index for time range queries
      periodStartIdx: index("productivity_metrics_period_start_idx").on(
        table.periodStart
      ),
      periodEndIdx: index("productivity_metrics_period_end_idx").on(
        table.periodEnd
      ),
      // Unique constraint for user + period
      userPeriodUnique: uniqueIndex("productivity_metrics_user_period_unique").on(
        table.userId,
        table.periodType,
        table.periodStart
      ),
      // Index for productivity score sorting
      productivityScoreIdx: index("productivity_metrics_score_idx").on(
        table.productivityScore
      ),
    };
  }
);

/**
 * Productivity Snapshots
 *
 * Pre-calculated daily aggregates for fast dashboard loading.
 * Updated daily via cron job or background worker.
 *
 * This table reduces computation time by storing daily calculations
 * that can be aggregated into weekly/monthly views on demand.
 */
export const productivitySnapshots = pgTable(
  "productivity_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Daily snapshot date
    snapshotDate: timestamp("snapshot_date", { withTimezone: true }).notNull(),

    // === DAILY ACTIVITY ===
    conversationsCreated: integer("conversations_created").notNull().default(0),
    messagesCreated: integer("messages_created").notNull().default(0),
    filesProcessed: integer("files_processed").notNull().default(0),
    activeSessions: integer("active_sessions").notNull().default(0),
    totalActiveTime: integer("total_active_time").notNull().default(0), // seconds

    // === DAILY SCORES ===
    dailyActivityScore: real("daily_activity_score").notNull().default(0), // 0-100
    dailyEngagementScore: real("daily_engagement_score").notNull().default(0), // 0-100
    dailyEfficiencyScore: real("daily_efficiency_score").notNull().default(0), // 0-100
    dailyValueScore: real("daily_value_score").notNull().default(0), // 0-100
    dailyProductivityScore: real("daily_productivity_score")
      .notNull()
      .default(0), // 0-100

    // === HOURLY BREAKDOWN ===
    activityByHour: jsonb("activity_by_hour").$type<{
      [hour: string]: {
        messages: number;
        conversations: number;
        activeMinutes: number;
      };
    }>(),

    // === MODEL USAGE ===
    modelsUsed: jsonb("models_used").$type<{
      [model: string]: {
        conversations: number;
        messages: number;
        tokensUsed: number;
      };
    }>(),

    // === METADATA ===
    isComplete: integer("is_complete").notNull().default(0), // 0 = partial, 1 = complete day
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => {
    return {
      // Index for fast user lookups
      userIdIdx: index("productivity_snapshots_user_id_idx").on(table.userId),
      // Index for date range queries
      snapshotDateIdx: index("productivity_snapshots_date_idx").on(
        table.snapshotDate
      ),
      // Unique constraint for user + date
      userDateUnique: uniqueIndex("productivity_snapshots_user_date_unique").on(
        table.userId,
        table.snapshotDate
      ),
      // Index for sorting by productivity score
      productivityScoreIdx: index("productivity_snapshots_score_idx").on(
        table.dailyProductivityScore
      ),
    };
  }
);

// Type exports for use in queries
export type UserProductivityMetric = typeof userProductivityMetrics.$inferSelect;
export type NewUserProductivityMetric = typeof userProductivityMetrics.$inferInsert;
export type ProductivitySnapshot = typeof productivitySnapshots.$inferSelect;
export type NewProductivitySnapshot = typeof productivitySnapshots.$inferInsert;
