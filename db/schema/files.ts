import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Files table
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(), // File size in bytes
  path: text("path").notNull(), // Storage path
  uploadStatus: varchar("upload_status", { length: 50 })
    .default("pending")
    .notNull(),
  analysisStatus: varchar("analysis_status", { length: 50 }).default("pending"),
  extractedText: text("extracted_text"),
  analysis: jsonb("analysis"), // AI analysis results
  metadata: jsonb("metadata"), // Additional file metadata
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// File relations
export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));
