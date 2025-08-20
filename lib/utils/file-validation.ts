export interface FileValidationConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    fileSize: number;
    mimeType: string;
    extension: string;
  };
}

// Default configuration
export const DEFAULT_FILE_CONFIG: FileValidationConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/rtf",

    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",

    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp4",

    // Video
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",

    // Archives
    "application/zip",
    "application/x-rar-compressed",
    "application/x-tar",
    "application/gzip",
  ],
  allowedExtensions: [
    // Documents
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
    ".csv",
    ".rtf",

    // Images
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",

    // Audio
    ".mp3",
    ".wav",
    ".ogg",
    ".m4a",

    // Video
    ".mp4",
    ".mpeg",
    ".mov",
    ".avi",

    // Archives
    ".zip",
    ".rar",
    ".tar",
    ".gz",
  ],
};

/**
 * Validate a file based on configuration
 */
export function validateFile(
  file: File,
  config: FileValidationConfig = DEFAULT_FILE_CONFIG
): FileValidationResult {
  const { name, size, type } = file;
  const extension = getFileExtension(name);

  // Check file size
  if (size > config.maxFileSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${formatFileSize(
        config.maxFileSize
      )}`,
      details: { fileSize: size, mimeType: type, extension },
    };
  }

  // Check MIME type
  if (type && !config.allowedMimeTypes.includes(type)) {
    return {
      isValid: false,
      error: `File type "${type}" is not allowed`,
      details: { fileSize: size, mimeType: type, extension },
    };
  }

  // Check file extension as fallback
  if (!config.allowedExtensions.includes(extension.toLowerCase())) {
    return {
      isValid: false,
      error: `File extension "${extension}" is not allowed`,
      details: { fileSize: size, mimeType: type, extension },
    };
  }

  // Check for empty files
  if (size === 0) {
    return {
      isValid: false,
      error: "File is empty",
      details: { fileSize: size, mimeType: type, extension },
    };
  }

  return {
    isValid: true,
    details: { fileSize: size, mimeType: type, extension },
  };
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  config: FileValidationConfig = DEFAULT_FILE_CONFIG
): { validFiles: File[]; invalidFiles: Array<{ file: File; error: string }> } {
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; error: string }> = [];

  for (const file of files) {
    const result = validateFile(file, config);
    if (result.isValid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, error: result.error || "Validation failed" });
    }
  }

  return { validFiles, invalidFiles };
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot);
}

/**
 * Get file type category
 */
export function getFileCategory(
  mimeType: string
): "document" | "image" | "audio" | "video" | "archive" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("tar") ||
    mimeType.includes("gzip")
  ) {
    return "archive";
  }
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("text")
  ) {
    return "document";
  }
  return "other";
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Generate safe filename
 */
export function generateSafeFilename(
  originalName: string,
  userId: string
): string {
  // Remove unsafe characters
  const safeName = originalName
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");

  // Add timestamp and user ID for uniqueness
  const timestamp = Date.now();
  const extension = getFileExtension(safeName);
  const nameWithoutExt = safeName.replace(extension, "");

  return `${userId}/${timestamp}_${nameWithoutExt}${extension}`;
}

/**
 * Check if file is processable for text extraction
 */
export function isProcessableFile(mimeType: string): boolean {
  const processableMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/rtf",
  ];

  return processableMimes.includes(mimeType);
}
