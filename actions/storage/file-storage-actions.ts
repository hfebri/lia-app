"use server";

import {
  uploadFile,
  uploadFiles,
  getUserFiles,
  deleteFile,
  getFileById,
} from "@/lib/services/file-upload";
import { ActionState } from "@/types";
import { requireAuthenticatedUser } from "@/lib/auth/session";

export interface FileUploadData {
  success: boolean;
  fileId?: string;
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
  error?: string;
}

export async function uploadFileStorageAction(
  formData: FormData,
  options?: {
    conversationId?: string;
    extractText?: boolean;
    analyzeWithAI?: boolean;
  }
): Promise<ActionState<FileUploadData>> {
  try {
    const { userId } = await requireAuthenticatedUser();

    const file = formData.get("file") as File;
    if (!file) {
      return {
        isSuccess: false,
        message: "No file provided",
      };
    }

    const uploadOptions = {
      userId,
      conversationId: options?.conversationId,
      extractText: options?.extractText ?? true,
      analyzeWithAI: options?.analyzeWithAI ?? false,
    };

    const result = await uploadFile(file, uploadOptions);

    if (!result.success) {
      return {
        isSuccess: false,
        message: result.error || "File upload failed",
      };
    }

    return {
      isSuccess: true,
      message: "File uploaded successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      isSuccess: false,
      message: "Failed to upload file",
    };
  }
}

export async function uploadMultipleFilesStorageAction(
  files: File[],
  options?: {
    conversationId?: string;
    extractText?: boolean;
    analyzeWithAI?: boolean;
  }
): Promise<
  ActionState<{
    successful: FileUploadData[];
    failed: Array<{ file: File; error: string }>;
  }>
> {
  try {
    const { userId } = await requireAuthenticatedUser();

    if (!files || files.length === 0) {
      return {
        isSuccess: false,
        message: "No files provided",
      };
    }

    const uploadOptions = {
      userId,
      conversationId: options?.conversationId,
      extractText: options?.extractText ?? true,
      analyzeWithAI: options?.analyzeWithAI ?? false,
    };

    const result = await uploadFiles(files, uploadOptions);

    return {
      isSuccess: true,
      message: `Uploaded ${result.successful.length} files successfully, ${result.failed.length} failed`,
      data: result,
    };
  } catch (error) {
    console.error("Error uploading files:", error);
    return {
      isSuccess: false,
      message: "Failed to upload files",
    };
  }
}

export async function getUserFilesStorageAction(options?: {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "size" | "filename";
  sortOrder?: "asc" | "desc";
  analysisStatus?: "pending" | "processing" | "completed" | "error";
}): Promise<ActionState<any[]>> {
  try {
    const { userId } = await requireAuthenticatedUser();

    const files = await getUserFiles(userId, options);

    return {
      isSuccess: true,
      message: "Files retrieved successfully",
      data: files,
    };
  } catch (error) {
    console.error("Error getting user files:", error);
    return {
      isSuccess: false,
      message: "Failed to get files",
    };
  }
}

export async function getFileByIdStorageAction(
  fileId: string
): Promise<ActionState<any>> {
  try {
    const { userId } = await requireAuthenticatedUser();

    const file = await getFileById(fileId, userId);

    if (!file) {
      return {
        isSuccess: false,
        message: "File not found",
      };
    }

    return {
      isSuccess: true,
      message: "File retrieved successfully",
      data: file,
    };
  } catch (error) {
    console.error("Error getting file:", error);
    return {
      isSuccess: false,
      message: "Failed to get file",
    };
  }
}

export async function deleteFileStorageAction(
  fileId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await requireAuthenticatedUser();

    const success = await deleteFile(fileId, userId);

    if (!success) {
      return {
        isSuccess: false,
        message: "Failed to delete file",
      };
    }

    return {
      isSuccess: true,
      message: "File deleted successfully",
      data: undefined,
    };
  } catch (error) {
    console.error("Error deleting file:", error);
    return {
      isSuccess: false,
      message: "Failed to delete file",
    };
  }
}
