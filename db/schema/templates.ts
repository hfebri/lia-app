import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { conversations } from "./conversations";

// Templates table
export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  prompt: text("prompt").notNull(),
  variables: jsonb("variables"), // For template variables/placeholders
  isPublic: boolean("is_public").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  usageCount: jsonb("usage_count").default("0"), // Track how many times used
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Template relations
export const templatesRelations = relations(templates, ({ one, many }) => ({
  creator: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
  }),
  conversations: many(conversations),
}));
