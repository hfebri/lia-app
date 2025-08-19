import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// User role enum
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  image: text("image"),
  role: userRoleEnum("role").default("user").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  messages: many(messages),
  files: many(files),
  analytics: many(analytics),
}));

// Import other tables for relations (will be defined in other files)
import { conversations } from "./conversations";
import { messages } from "./conversations";
import { files } from "./files";
import { analytics } from "./analytics";
