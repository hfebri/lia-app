"use client";

import { useState, useCallback } from "react";

export interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
  uploadStatus: "pending" | "uploading" | "completed" | "error";
  analysisStatus: "pending" | "processing" | "completed" | "error";
  extractedText?: string;
  analysis?: {
    summary?: string;
    keyPoints?: string[];
    insights?: string[];
    sentiment?: "positive" | "neutral" | "negative";
    topics?: string[];
  };
  uploadedAt: Date;
  metadata?: any;
}

export interface UseFileUploadReturn {
  files: FileItem[];
  isUploading: boolean;
  uploadFiles: (
    files: File[],
    options?: {
      extractText?: boolean;
      analyzeWithAI?: boolean;
      conversationId?: string;
    }
  ) => Promise<void>;
  analyzeFile: (fileId: string) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshFiles = useCallback(async () => {
    try {
      const response = await fetch("/api/files");
      const result = await response.json();

      if (result.success) {
        const formattedFiles: FileItem[] = result.data.files.map(
          (file: any) => ({
            id: file.id,
            filename: file.filename,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            url: file.url,
            uploadStatus: file.uploadStatus,
            analysisStatus: file.analysisStatus,
            extractedText: file.extractedText,
            analysis: file.metadata?.analysis,
            uploadedAt: new Date(file.createdAt),
            metadata: file.metadata,
          })
        );

        setFiles(formattedFiles);
      } else {
        setError(result.error || "Failed to load files");
      }
    } catch (err) {
      setError("Failed to load files");
    }
  }, []);

  const uploadFiles = useCallback(
    async (
      fileList: File[],
      options: {
        extractText?: boolean;
        analyzeWithAI?: boolean;
        conversationId?: string;
      } = {}
    ) => {
      if (fileList.length === 0) return;

      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();

        fileList.forEach((file) => {
          formData.append("files", file);
        });

        if (options.conversationId) {
          formData.append("conversationId", options.conversationId);
        }

        formData.append("extractText", String(options.extractText ?? true));
        formData.append("analyzeWithAI", String(options.analyzeWithAI ?? true));

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          // Refresh files list to get the uploaded files
          await refreshFiles();
        } else {
          setError(result.error || "Upload failed");
        }
      } catch (err) {
        setError("Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [refreshFiles]
  );

  const analyzeFile = useCallback(async (fileId: string) => {
    try {
      setError(null);

      // Update file status to processing
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? { ...file, analysisStatus: "processing" as const }
            : file
        )
      );

      const response = await fetch("/api/files/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          options: {
            includeKeyPoints: true,
            includeInsights: true,
            includeSentiment: true,
            includeTopics: true,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update file with analysis results
        setFiles((prev) =>
          prev.map((file) =>
            file.id === fileId
              ? {
                  ...file,
                  analysisStatus: "completed" as const,
                  analysis: result.data,
                }
              : file
          )
        );
      } else {
        setError(result.error || "Analysis failed");
        setFiles((prev) =>
          prev.map((file) =>
            file.id === fileId
              ? { ...file, analysisStatus: "error" as const }
              : file
          )
        );
      }
    } catch (err) {
      setError("Analysis failed");
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? { ...file, analysisStatus: "error" as const }
            : file
        )
      );
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        // Remove file from local state
        setFiles((prev) => prev.filter((file) => file.id !== fileId));
      } else {
        setError(result.error || "Delete failed");
      }
    } catch (err) {
      setError("Delete failed");
    }
  }, []);

  return {
    files,
    isUploading,
    uploadFiles,
    analyzeFile,
    deleteFile,
    refreshFiles,
    error,
    clearError,
  };
}
