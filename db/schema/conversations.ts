import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Conversations table with embedded messages
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  aiModel: varchar("ai_model", { length: 100 }).notNull().default("gpt-4"),
  messages: jsonb("messages").notNull().default("[]"), // Array of message objects
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Conversation relations
export const conversationsRelations = relations(
  conversations,
  ({ one }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
  })
);
