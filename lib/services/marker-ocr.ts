import Replicate from "replicate";

/**
 * Marker OCR Service
 *
 * Uses Replicate's datalab-to/marker model for high-quality document OCR.
 * Supports: PDF, DOC, DOCX, PPT, PPTX, PNG, JPG, JPEG, WEBP
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

export class MarkerOCRService {
  private client: Replicate;

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
   * Process a file using Marker OCR
   * @param fileUrl - URL to the file (must be publicly accessible)
   * @param options - Marker processing options
   */
  async processFile(
    fileUrl: string,
    options: Partial<MarkerInput> = {}
  ): Promise<MarkerOutput> {
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

      // The output is a structured object with markdown and metadata
      return output as MarkerOutput;
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
