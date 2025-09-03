/**
 * Utility functions for file processing and conversion
 */

export interface FileData {
  data: string; // base64 encoded data
  mimeType: string;
  name: string;
  size: number;
}

/**
 * Convert a File object to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:mime/type;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a File object to FileData for AI processing
 */
export async function processFileForAI(file: File): Promise<FileData> {
  const base64Data = await fileToBase64(file);

  return {
    data: base64Data,
    mimeType: file.type,
    name: file.name,
    size: file.size,
  };
}

/**
 * Check if file type is supported for AI processing
 */
export function isSupportedFileType(file: File): boolean {
  const supportedTypes = [
    // PDF
    "application/pdf",
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/svg+xml",
    // Text files
    "text/plain",
    "text/csv",
    "text/markdown",
    // Microsoft Office
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    // OpenDocument
    "application/vnd.oasis.opendocument.text", // .odt
    "application/vnd.oasis.opendocument.spreadsheet", // .ods
    "application/vnd.oasis.opendocument.presentation", // .odp
  ];

  return supportedTypes.includes(file.type);
}

/**
 * Validate file size (max 50MB)
 */
export function isValidFileSize(file: File, maxSizeMB: number = 50): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Validate file for AI processing
 */
export function validateFileForAI(file: File): {
  isValid: boolean;
  error?: string;
} {
  if (!isSupportedFileType(file)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not supported. Supported types include PDF, images, text files, and common document formats.`,
    };
  }

  if (!isValidFileSize(file)) {
    return {
      isValid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(
        2
      )}MB) exceeds the maximum limit of 50MB.`,
    };
  }

  return { isValid: true };
}
