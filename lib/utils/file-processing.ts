/**
 * Utility functions for file processing and conversion
 * Supports multi-file uploads with native vision API integration
 */

import { AIFileAttachment, FILE_LIMITS, FileTypeUtils } from "@/lib/ai/types";

export interface FileData {
  data: string; // base64 encoded data
  mimeType: string;
  name: string;
  size: number;
}

/**
 * Read a file as base64 data
 * Removes the data URL prefix for API transmission
 */
export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:mime/type;base64, prefix
      const base64Data = result.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Read a text file's contents
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read text file: ${file.name}`));
    reader.readAsText(file);
  });
}

/**
 * Check if image type supports animation/multiple frames
 * These should not be compressed via canvas as it will collapse to first frame
 */
function isAnimatedImageFormat(mimeType: string): boolean {
  const animatedFormats = [
    "image/gif",      // Animated GIFs
    "image/webp",     // Animated WebP
    "image/apng",     // Animated PNG
  ];
  return animatedFormats.includes(mimeType.toLowerCase());
}

/**
 * Compress an image if it exceeds maximum dimensions
 * Reduces token usage by 50-70% for large images
 *
 * IMPORTANT: Skips animated formats (GIF, WebP, APNG) to preserve animation
 *
 * @param file - Image file to compress
 * @param maxDimension - Maximum width/height (default: 2048px)
 * @returns Compressed image file or original if smaller/animated
 */
export async function compressImageIfNeeded(
  file: File,
  maxDimension: number = FILE_LIMITS.maxImageDimension
): Promise<File> {
  // Only process images
  if (!FileTypeUtils.isImage(file.type)) {
    return file;
  }

  // IMPORTANT: Skip animated formats - canvas rendering destroys animation
  // GIFs, animated WebP, and APNG will collapse to first frame if processed
  if (isAnimatedImageFormat(file.type)) {
    console.log(`[Image Compression] Skipping animated format: ${file.name} (${file.type})`);
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Check if resizing is needed
      if (img.width <= maxDimension && img.height <= maxDimension) {
        resolve(file); // Return original if already small enough
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      let newWidth = img.width;
      let newHeight = img.height;

      if (img.width > img.height) {
        if (img.width > maxDimension) {
          newWidth = maxDimension;
          newHeight = (img.height * maxDimension) / img.width;
        }
      } else {
        if (img.height > maxDimension) {
          newHeight = maxDimension;
          newWidth = (img.width * maxDimension) / img.height;
        }
      }

      // Create canvas and resize
      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to blob with 85% quality
      // Note: For static formats only (JPEG, PNG)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }

          // Create new file from blob
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        file.type,
        0.85 // 85% quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
}

/**
 * Process a single file for AI vision/document APIs
 *
 * @param file - File to process
 * @param options - Processing options
 * @returns AIFileAttachment with base64 data or extracted text
 */
export async function processFileForAI(
  file: File,
  options: {
    compressImages?: boolean;
    extractText?: boolean;
  } = {}
): Promise<AIFileAttachment> {
  const { compressImages = true, extractText = false } = options;

  try {
    // Handle images with optional compression
    if (FileTypeUtils.isImage(file.type)) {
      const processedFile = compressImages
        ? await compressImageIfNeeded(file)
        : file;

      const base64Data = await readFileAsBase64(processedFile);

      return {
        name: file.name,
        type: file.type,
        size: processedFile.size,
        data: base64Data,
        processingMethod: "vision",
      };
    }

    // Handle PDFs - use native vision for Claude, OCR fallback for others
    if (FileTypeUtils.isPDF(file.type)) {
      const base64Data = await readFileAsBase64(file);

      return {
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data,
        processingMethod: "vision", // Claude supports native PDF
      };
    }

    // Handle text files - extract content
    if (FileTypeUtils.isText(file.type)) {
      const textContent = extractText ? await readFileAsText(file) : undefined;

      return {
        name: file.name,
        type: file.type,
        size: file.size,
        extractedText: textContent,
        processingMethod: "text-extraction",
      };
    }

    // Unsupported file type
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      error: `Unsupported file type: ${file.type}`,
    };
  } catch (error) {
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      error: error instanceof Error ? error.message : "Unknown processing error",
    };
  }
}

/**
 * Process multiple files in parallel for AI
 *
 * @param files - Array of files to process
 * @param options - Processing options with progress callback
 * @returns Array of AIFileAttachments
 */
export async function processMultipleFilesForAI(
  files: File[],
  options?: {
    compressImages?: boolean;
    extractText?: boolean;
    onProgress?: (fileName: string, progress: number, total: number) => void;
  }
): Promise<AIFileAttachment[]> {
  const { onProgress } = options || {};
  const total = files.length;
  let completed = 0;

  // Process all files in parallel
  const results = await Promise.all(
    files.map(async (file) => {
      const result = await processFileForAI(file, options);

      // Report progress
      completed++;
      if (onProgress) {
        onProgress(file.name, completed, total);
      }

      return result;
    })
  );

  return results;
}

/**
 * Validate a single file against limits
 */
export function validateFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  // Check file type
  if (!FILE_LIMITS.allowedMimeTypes.includes(file.type as any)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not supported`,
    };
  }

  // Check individual file size
  if (file.size > FILE_LIMITS.maxIndividualSize) {
    return {
      isValid: false,
      error: `File size ${formatFileSize(file.size)} exceeds limit of ${formatFileSize(FILE_LIMITS.maxIndividualSize)}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate multiple files against aggregate limits
 */
export function validateMultipleFiles(files: File[]): {
  isValid: boolean;
  errors: Array<{ fileName: string; error: string }>;
  warnings: Array<{ fileName: string; warning: string }>;
} {
  const errors: Array<{ fileName: string; error: string }> = [];
  const warnings: Array<{ fileName: string; warning: string }> = [];

  // Check file count
  if (files.length > FILE_LIMITS.maxFilesPerMessage) {
    errors.push({
      fileName: "general",
      error: `Cannot upload more than ${FILE_LIMITS.maxFilesPerMessage} files at once`,
    });
    return { isValid: false, errors, warnings };
  }

  // Check individual files
  files.forEach((file) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      errors.push({ fileName: file.name, error: validation.error! });
    }
  });

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > FILE_LIMITS.maxTotalSize) {
    errors.push({
      fileName: "general",
      error: `Total size ${formatFileSize(totalSize)} exceeds limit of ${formatFileSize(FILE_LIMITS.maxTotalSize)}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get icon name for file type (for UI display)
 */
export function getFileIcon(mimeType: string): string {
  if (FileTypeUtils.isImage(mimeType)) return "image";
  if (FileTypeUtils.isPDF(mimeType)) return "file-text";
  if (FileTypeUtils.isText(mimeType)) return "file-text";
  return "file";
}

// Legacy compatibility exports
export const fileToBase64 = readFileAsBase64;
export const isSupportedFileType = (file: File) =>
  FILE_LIMITS.allowedMimeTypes.includes(file.type as any);
export const isValidFileSize = (file: File, maxSizeMB: number = 50) =>
  file.size <= maxSizeMB * 1024 * 1024;
export const validateFileForAI = validateFile;
