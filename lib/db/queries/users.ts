import { eq, desc, asc, count, and, isNull, sql } from "drizzle-orm";
import { db } from "../../../db/db";
import { users, conversations } from "../../../db/schema";
import type {
  User,
  NewUser,
  UserWithStats,
  PaginationParams,
} from "../../../db/types";

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
}

// Create new user
export async function createUser(userData: NewUser): Promise<User> {
  const result = await db
    .insert(users)
    .values({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0];
}

// Update user
export async function updateUser(
  id: string,
  userData: Partial<NewUser>
): Promise<User | null> {
  const result = await db
    .update(users)
    .set({
      ...userData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return result[0] || null;
}

// Delete user (soft delete by setting isActive to false)
export async function deleteUser(id: string): Promise<boolean> {
  const result = await db
    .update(users)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return result.length > 0;
}

// Get users with pagination
export async function getUsers(params: PaginationParams = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;
  const offset = (page - 1) * limit;

  // Validate sortBy against actual table columns
  const validSortColumns = {
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  };
  
  const sortColumn = validSortColumns[sortBy as keyof typeof validSortColumns] || users.createdAt;

  const orderBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [userList, totalCount] = await Promise.all([
    db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(users).where(eq(users.isActive, true)),
  ]);

  return {
    users: userList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get user with statistics
export async function getUserWithStats(
  id: string
): Promise<UserWithStats | null> {
  const user = await getUserById(id);
  if (!user) return null;

  const conversationCount = await db
    .select({ count: count() })
    .from(conversations)
    .where(eq(conversations.userId, id));

  // Count messages from JSONB array in conversations table
  const messageCountResult = await db
    .select({
      count: sql<number>`SUM(jsonb_array_length(${conversations.messages}))`,
    })
    .from(conversations)
    .where(eq(conversations.userId, id));

  return {
    ...user,
    conversationCount: conversationCount[0].count,
    messageCount: messageCountResult[0]?.count || 0,
    totalTokensUsed: 0, // Will be calculated from tokens field in messages metadata
  };
}

// Get active users count
export async function getActiveUsersCount(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.isActive, true));
  return result[0].count;
}

// Update user role
export async function updateUserRole(
  id: string,
  role: "user" | "admin"
): Promise<User | null> {
  return updateUser(id, { role });
}

// Get admin users
export async function getAdminUsers(): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
    .orderBy(desc(users.createdAt));
}
