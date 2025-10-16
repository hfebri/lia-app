import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, InferSelectModel } from "drizzle-orm";

// User role enum
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  image: text("image"),
  role: userRoleEnum("role").default("user").notNull(),
  professionalRole: varchar("professional_role", { length: 200 }), // User's job title/role for personalized AI responses
  isActive: boolean("is_active").default(true).notNull(),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Import other tables for relations (will be defined in other files)
import { conversations } from "./conversations";
import { files } from "./files";
import { analytics } from "./analytics";

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  files: many(files),
  analytics: many(analytics),
}));

// Type inference for users table
export type SelectUser = InferSelectModel<typeof users>;
