import { createClient } from "@supabase/supabase-js";
import { db } from "@/db/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  validateFile,
  generateSafeFilename,
  formatFileSize,
} from "@/lib/utils/file-validation";
import { extractTextFromFile } from "@/lib/utils/text-extraction";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Temporary: Handle missing service key gracefully
let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "user-files";

export interface FileUploadOptions {
  userId: string;
  conversationId?: string;
  extractText?: boolean;
  analyzeWithAI?: boolean;
}

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    url: string;
    extractedText?: string;
    metadata?: any;
  };
}

/**
 * Upload a file to Supabase Storage and save metadata to database
 */
export async function uploadFile(
  file: File,
  options: FileUploadOptions
): Promise<FileUploadResult> {
  try {
    // Check if Supabase is properly configured
    if (!supabase) {
      return {
        success: false,
        error: "File storage is not configured. Missing SUPABASE_SERVICE_ROLE_KEY environment variable.",
      };
    }
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generate safe filename
    const safePath = generateSafeFilename(file.name, options.userId);

    // Convert File to Buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(safePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(safePath);

    // Extract text if requested and file is processable
    let extractedText: string | undefined;
    let extractionMetadata: any = {};

    if (options.extractText) {
      const extraction = await extractTextFromFile(
        buffer,
        file.type,
        file.name
      );
      if (extraction.success) {
        extractedText = extraction.text;
        extractionMetadata = extraction.metadata;
      }
    }

    // Save file metadata to database
    const fileRecord = {
      userId: options.userId,
      filename: safePath.split("/").pop() || file.name,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: safePath,
      uploadStatus: "completed" as const,
      analysisStatus: options.analyzeWithAI
        ? ("pending" as const)
        : ("completed" as const),
      extractedText,
      metadata: {
        ...extractionMetadata,
        conversationId: options.conversationId,
        extractionSuccess: extractedText ? true : false,
      },
      isActive: true,
    };

    const [savedFile] = await db.insert(files).values(fileRecord).returning();

    return {
      success: true,
      fileId: savedFile.id,
      file: {
        id: savedFile.id,
        filename: savedFile.filename,
        originalName: savedFile.originalName,
        mimeType: savedFile.mimeType,
        size: savedFile.size,
        path: savedFile.path,
        url: urlData.publicUrl,
        extractedText: savedFile.extractedText || undefined,
        metadata: savedFile.metadata,
      },
    };
  } catch (error) {
    console.error("File upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown upload error",
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  fileList: File[],
  options: FileUploadOptions
): Promise<{
  successful: FileUploadResult[];
  failed: Array<{ file: File; error: string }>;
}> {
  const successful: FileUploadResult[] = [];
  const failed: Array<{ file: File; error: string }> = [];

  for (const file of fileList) {
    try {
      const result = await uploadFile(file, options);
      if (result.success) {
        successful.push(result);
      } else {
        failed.push({ file, error: result.error || "Upload failed" });
      }
    } catch (error) {
      failed.push({
        file,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { successful, failed };
}

/**
 * Get file download URL
 */
export async function getFileDownloadUrl(
  filePath: string
): Promise<string | null> {
  try {
    if (!supabase) {
      return null;
    }
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error getting download URL:", error);
    return null;
  }
}

/**
 * Delete file from storage and database
 */
export async function deleteFile(
  fileId: string,
  userId: string
): Promise<boolean> {
  try {
    if (!supabase) {
      return false;
    }
    // Get file record
    const fileRecord = await db.query.files.findFirst({
      where: (files, { eq, and }) =>
        and(eq(files.id, fileId), eq(files.userId, userId)),
    });

    if (!fileRecord) {
      return false;
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([fileRecord.path]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Mark as inactive in database (soft delete)
    await db
      .update(files)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(files.id, fileId));

    return true;
  } catch (error) {
    console.error("File deletion error:", error);
    return false;
  }
}

/**
 * Get file metadata by ID
 */
export async function getFileById(fileId: string, userId: string) {
  try {
    const file = await db.query.files.findFirst({
      where: (files, { eq, and }) =>
        and(
          eq(files.id, fileId),
          eq(files.userId, userId),
          eq(files.isActive, true)
        ),
    });

    if (!file) return null;

    // Get download URL
    const downloadUrl = await getFileDownloadUrl(file.path);

    return {
      ...file,
      url: downloadUrl,
    };
  } catch (error) {
    console.error("Error getting file:", error);
    return null;
  }
}

/**
 * Get user's files with pagination
 */
export async function getUserFiles(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    sortBy?: "createdAt" | "size" | "filename";
    sortOrder?: "asc" | "desc";
    analysisStatus?: "pending" | "processing" | "completed" | "error";
  } = {}
) {
  try {
    // Return empty array if file storage is not configured
    if (!supabase) {
      return [];
    }
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      analysisStatus,
    } = options;

    const offset = (page - 1) * limit;

    let query = db.query.files.findMany({
      where: (files, { eq, and }) => {
        const conditions = [eq(files.userId, userId), eq(files.isActive, true)];

        if (analysisStatus) {
          conditions.push(eq(files.analysisStatus, analysisStatus));
        }

        return and(...conditions);
      },
      limit,
      offset,
      orderBy: (files, { asc, desc }) => {
        const column = files[sortBy];
        return sortOrder === "asc" ? asc(column) : desc(column);
      },
    });

    const userFiles = await query;

    // Add download URLs
    const filesWithUrls = await Promise.all(
      userFiles.map(async (file) => ({
        ...file,
        url: await getFileDownloadUrl(file.path),
      }))
    );

    return filesWithUrls;
  } catch (error) {
    console.error("Error getting user files:", error);
    return [];
  }
}
