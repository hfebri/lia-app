import Replicate from "replicate";
import crypto from "crypto";

/**
 * Marker OCR Service
 *
 * Uses Replicate's datalab-to/marker model for high-quality document OCR.
 * Supports: PDF, DOC, DOCX, PPT, PPTX, PNG, JPG, JPEG, WEBP
 *
 * Features:
 * - In-memory caching to avoid re-processing same files
 * - Cache eviction after 1 hour
 * - Automatic cache size management (max 100 entries)
 */

interface MarkerInput {
  file: string | File | Buffer;
  mode?: "balanced" | "accurate" | "fast";
  use_llm?: boolean;
  paginate?: boolean;
  force_ocr?: boolean;
  skip_cache?: boolean;
  format_lines?: boolean;
  save_checkpoint?: boolean;
  disable_ocr_math?: boolean;
  include_metadata?: boolean;
  strip_existing_ocr?: boolean;
  disable_image_extraction?: boolean;
}

interface MarkerOutput {
  markdown: string;
  metadata?: {
    languages?: string[];
    filetype?: string;
    pages?: number;
    table_of_contents?: any[];
  };
  images?: Record<string, string>;
}

interface CacheEntry {
  result: MarkerOutput;
  timestamp: number;
}

export class MarkerOCRService {
  private client: Replicate;
  private static cache: Map<string, CacheEntry> = new Map();
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private static readonly MAX_CACHE_SIZE = 100;

  constructor() {
    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      throw new Error("REPLICATE_API_TOKEN environment variable is required");
    }
    this.client = new Replicate({
      auth: apiKey,
    });
  }

  /**
   * Generate cache key from file URL and options
   */
  private static getCacheKey(fileUrl: string, options: Partial<MarkerInput>): string {
    const keyData = JSON.stringify({
      url: fileUrl,
      mode: options.mode || "fast",
      force_ocr: options.force_ocr ?? false,
      include_metadata: options.include_metadata ?? true,
    });
    return crypto.createHash("md5").update(keyData).digest("hex");
  }

  /**
   * Get cached result if available and not expired
   */
  private static getCachedResult(cacheKey: string): MarkerOutput | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      // Cache expired
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  /**
   * Store result in cache with automatic size management
   */
  private static setCachedResult(cacheKey: string, result: MarkerOutput): void {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entriesToRemove = this.cache.size - this.MAX_CACHE_SIZE + 1;
      const keys = Array.from(this.cache.keys());
      for (let i = 0; i < entriesToRemove; i++) {
        this.cache.delete(keys[i]);
      }
    }

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Process a file using Marker OCR with caching
   * @param fileUrl - URL to the file (must be publicly accessible)
   * @param options - Marker processing options
   */
  async processFile(
    fileUrl: string,
    options: Partial<MarkerInput> = {}
  ): Promise<MarkerOutput> {
    // Check cache first (unless skip_cache is true)
    if (!options.skip_cache) {
      const cacheKey = MarkerOCRService.getCacheKey(fileUrl, options);
      const cachedResult = MarkerOCRService.getCachedResult(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    try {
      const input: MarkerInput = {
        file: fileUrl,
        mode: options.mode || "fast",
        use_llm: options.use_llm ?? false,
        paginate: options.paginate ?? false,
        force_ocr: options.force_ocr ?? false,
        skip_cache: options.skip_cache ?? false,
        format_lines: options.format_lines ?? false,
        save_checkpoint: options.save_checkpoint ?? false,
        disable_ocr_math: options.disable_ocr_math ?? false,
        include_metadata: options.include_metadata ?? true,
        strip_existing_ocr: options.strip_existing_ocr ?? false,
        disable_image_extraction: options.disable_image_extraction ?? false,
      };

      const output = await this.client.run("datalab-to/marker", {
        input,
      });

      const result = output as MarkerOutput;

      // Cache the result
      if (!options.skip_cache) {
        const cacheKey = MarkerOCRService.getCacheKey(fileUrl, options);
        MarkerOCRService.setCachedResult(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error("Marker OCR error:", error);
      throw new Error(
        `Failed to process file with Marker: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Clear the OCR cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttl: this.CACHE_TTL,
    };
  }

  /**
   * Check if a file type is supported by Marker
   */
  static isSupportedFileType(mimeType: string): boolean {
    const supportedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    return supportedTypes.includes(mimeType);
  }

  /**
   * Get file extension from mime type
   */
  static getFileExtension(mimeType: string): string | null {
    const mimeToExt: Record<string, string> = {
      "application/pdf": ".pdf",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      "application/vnd.ms-powerpoint": ".ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/webp": ".webp",
    };

    return mimeToExt[mimeType] || null;
  }

  /**
   * Static factory method to create service instance
   */
  static create(): MarkerOCRService {
    return new MarkerOCRService();
  }
}
