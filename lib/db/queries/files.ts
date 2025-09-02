import { eq, desc, asc, count, and, sql } from "drizzle-orm";
import { db } from "../../../db/db";
import { files, users } from "../../../db/schema";
import type {
  File,
  NewFile,
  FileWithAnalysis,
  PaginationParams,
} from "../../../db/types";

// Get file by ID
export async function getFileById(id: string): Promise<File | null> {
  const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return result[0] || null;
}

// Get file with user info
export async function getFileWithUser(
  id: string
): Promise<(File & { user: { id: string; name: string | null; email: string } }) | null> {
  const result = await db.query.files.findFirst({
    where: eq(files.id, id),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return result || null;
}

// Create new file record
export async function createFile(fileData: NewFile): Promise<File> {
  const result = await db
    .insert(files)
    .values({
      ...fileData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0];
}

// Update file
export async function updateFile(
  id: string,
  fileData: Partial<NewFile>
): Promise<File | null> {
  const result = await db
    .update(files)
    .set({
      ...fileData,
      updatedAt: new Date(),
    })
    .where(eq(files.id, id))
    .returning();
  return result[0] || null;
}

// Delete file (soft delete)
export async function deleteFile(id: string): Promise<boolean> {
  const result = await db
    .update(files)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(files.id, id))
    .returning();
  return result.length > 0;
}

// Hard delete file
export async function hardDeleteFile(id: string): Promise<boolean> {
  const result = await db.delete(files).where(eq(files.id, id)).returning();
  return result.length > 0;
}

// Get files by user ID
export async function getFilesByUserId(
  userId: string,
  params: PaginationParams = {}
) {
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;
  const offset = (page - 1) * limit;

  // Validate sortBy against actual table columns
  const validSortColumns = {
    id: files.id,
    filename: files.filename,
    originalName: files.originalName,
    createdAt: files.createdAt,
    updatedAt: files.updatedAt,
    size: files.size,
    mimeType: files.mimeType,
  };
  
  const sortColumn = validSortColumns[sortBy as keyof typeof validSortColumns] || files.createdAt;

  const orderBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [fileList, totalCount] = await Promise.all([
    db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), eq(files.isActive, true)))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(files)
      .where(and(eq(files.userId, userId), eq(files.isActive, true))),
  ]);

  return {
    files: fileList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get files by upload status
export async function getFilesByUploadStatus(
  uploadStatus: string,
  params: PaginationParams = {}
) {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const [fileList, totalCount] = await Promise.all([
    db
      .select()
      .from(files)
      .where(
        and(eq(files.uploadStatus, uploadStatus), eq(files.isActive, true))
      )
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(files)
      .where(
        and(eq(files.uploadStatus, uploadStatus), eq(files.isActive, true))
      ),
  ]);

  return {
    files: fileList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get files by analysis status
export async function getFilesByAnalysisStatus(
  analysisStatus: string,
  params: PaginationParams = {}
) {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const [fileList, totalCount] = await Promise.all([
    db
      .select()
      .from(files)
      .where(
        and(eq(files.analysisStatus, analysisStatus), eq(files.isActive, true))
      )
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(files)
      .where(
        and(eq(files.analysisStatus, analysisStatus), eq(files.isActive, true))
      ),
  ]);

  return {
    files: fileList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Update file upload status
export async function updateFileUploadStatus(
  id: string,
  status: string
): Promise<File | null> {
  return updateFile(id, { uploadStatus: status });
}

// Update file analysis status
export async function updateFileAnalysisStatus(
  id: string,
  status: string
): Promise<File | null> {
  return updateFile(id, { analysisStatus: status });
}

// Update file extracted text
export async function updateFileExtractedText(
  id: string,
  extractedText: string
): Promise<File | null> {
  return updateFile(id, { extractedText });
}

// Update file analysis results
export async function updateFileAnalysis(
  id: string,
  analysis: any
): Promise<File | null> {
  return updateFile(id, { analysis });
}

// Search files by filename
export async function searchFilesByName(
  userId: string,
  searchTerm: string,
  params: PaginationParams = {}
) {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const [fileList, totalCount] = await Promise.all([
    db
      .select()
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          eq(files.isActive, true),
          sql`(${files.filename} ILIKE ${"%" + searchTerm + "%"} OR ${
            files.originalName
          } ILIKE ${"%" + searchTerm + "%"})`
        )
      )
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          eq(files.isActive, true),
          sql`(${files.filename} ILIKE ${"%" + searchTerm + "%"} OR ${
            files.originalName
          } ILIKE ${"%" + searchTerm + "%"})`
        )
      ),
  ]);

  return {
    files: fileList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get files by mime type
export async function getFilesByMimeType(
  userId: string,
  mimeType: string,
  params: PaginationParams = {}
) {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const [fileList, totalCount] = await Promise.all([
    db
      .select()
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          eq(files.mimeType, mimeType),
          eq(files.isActive, true)
        )
      )
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          eq(files.mimeType, mimeType),
          eq(files.isActive, true)
        )
      ),
  ]);

  return {
    files: fileList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get files count by user
export async function getFilesCountByUser(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(files)
    .where(and(eq(files.userId, userId), eq(files.isActive, true)));
  return result[0].count;
}

// Get total storage used by user (in bytes)
export async function getStorageUsedByUser(userId: string): Promise<number> {
  const result = await db
    .select({ totalSize: sql<number>`COALESCE(SUM(${files.size}), 0)` })
    .from(files)
    .where(and(eq(files.userId, userId), eq(files.isActive, true)));
  return result[0].totalSize || 0;
}

// Get recent files across all users (admin)
export async function getRecentFiles(
  limit: number = 20
): Promise<(File & { user: { id: string; name: string | null; email: string } })[]> {
  return db.query.files.findMany({
    where: eq(files.isActive, true),
    limit,
    orderBy: [desc(files.createdAt)],
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

// Get file statistics
export async function getFileStatistics(): Promise<{
  totalFiles: number;
  totalSize: number;
  filesByType: { mimeType: string; count: number; totalSize: number }[];
}> {
  const [totalStats, filesByType] = await Promise.all([
    db
      .select({
        totalFiles: count(),
        totalSize: sql<number>`COALESCE(SUM(${files.size}), 0)`,
      })
      .from(files)
      .where(eq(files.isActive, true)),
    db
      .select({
        mimeType: files.mimeType,
        count: count(),
        totalSize: sql<number>`COALESCE(SUM(${files.size}), 0)`,
      })
      .from(files)
      .where(eq(files.isActive, true))
      .groupBy(files.mimeType)
      .orderBy(desc(count())),
  ]);

  return {
    totalFiles: totalStats[0].totalFiles,
    totalSize: totalStats[0].totalSize || 0,
    filesByType,
  };
}

// Get files pending analysis
export async function getFilesPendingAnalysis(
  limit: number = 50
): Promise<File[]> {
  return db
    .select()
    .from(files)
    .where(
      and(
        eq(files.analysisStatus, "pending"),
        eq(files.uploadStatus, "completed"),
        eq(files.isActive, true)
      )
    )
    .orderBy(asc(files.createdAt))
    .limit(limit);
}
