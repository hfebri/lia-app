// AI service type definitions for unified interface across providers

/**
 * File attachment for AI messages
 * Supports native vision APIs (images, PDFs) and text extraction
 */
export interface AIFileAttachment {
  /** Original filename */
  name: string;
  /** MIME type (e.g., "image/jpeg", "application/pdf") */
  type: string;
  /** File size in bytes */
  size?: number;
  /** Base64-encoded file data for vision APIs */
  data?: string;
  /** URL to file (alternative to base64 data) */
  url?: string;
  /** Extracted text content (for non-vision processing) */
  extractedText?: string;
  /** Processing method used */
  processingMethod?: "vision" | "ocr" | "text-extraction";
  /** Processing error, if any */
  error?: string;
}

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  /** Multiple file attachments - supports native vision and document processing */
  files?: AIFileAttachment[];
}

export interface AIStreamChunk {
  content: string;
  isComplete: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  provider: string;
  fileValidationWarnings?: Array<{ fileName: string; reason: string }>;
}

export interface AIProvider {
  name: string;
  models: string[];
  generateResponse(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): Promise<AIResponse>;
  generateStream(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): AsyncGenerator<AIStreamChunk>;
}

export interface AIGenerationOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  system_prompt?: string;
  extended_thinking?: boolean; // Claude-exclusive
  thinking_budget_tokens?: number; // Claude thinking budget (min: 1024)
  enable_web_search?: boolean; // Claude & OpenAI - enable web search capabilities
  enable_file_search?: boolean; // OpenAI - enable file search capabilities
  max_image_resolution?: number;
  reasoning_effort?: "minimal" | "low" | "medium" | "high"; // OpenAI
  verbosity?: "low" | "medium" | "high"; // OpenAI - control response detail level
}

export interface AIServiceConfig {
  defaultProvider: string;
  providers: {
    [key: string]: {
      apiKey: string;
      models: string[];
      defaultModel: string;
    };
  };
}

export type AIProviderName = "replicate" | "openai" | "anthropic";

// Tool-related types for function calling and hosted tools
export interface ToolDefinition {
  type: "function" | "custom";
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
  custom?: {
    name: string;
    description?: string;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  role: "tool";
  content: string;
}

export interface AIError extends Error {
  provider: string;
  model?: string;
  code?: string;
  details?: any;
}

/**
 * File upload limits and validation constants
 */
export const FILE_LIMITS = {
  /** Maximum number of files per message */
  maxFilesPerMessage: 10,
  /** Maximum total size of all files (50MB) */
  maxTotalSize: 50 * 1024 * 1024,
  /** Maximum size per individual file (10MB) */
  maxIndividualSize: 10 * 1024 * 1024,
  /** Maximum image dimension for auto-resize (saves tokens) */
  maxImageDimension: 2048,
  /** Allowed MIME types for file uploads */
  allowedMimeTypes: [
    // Images (native vision support)
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/svg+xml",
    "image/tiff",
    "image/avif",
    "image/heic",
    "image/heif",
    // PDFs
    "application/pdf", // Claude: native, OpenAI: OCR fallback
    // Text files
    "text/plain",
    "text/csv",
    "text/markdown",
    "text/rtf",
    "application/rtf",
    // Microsoft Office (via Marker OCR)
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "application/msword", // .doc
    "application/vnd.ms-excel", // .xls
    "application/vnd.ms-powerpoint", // .ppt
    "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
    // OpenDocument (via Marker OCR)
    "application/vnd.oasis.opendocument.text", // .odt
    "application/vnd.oasis.opendocument.spreadsheet", // .ods
    "application/vnd.oasis.opendocument.presentation", // .odp
  ] as const,
} as const;

/**
 * File type detection helpers
 */
export const FileTypeUtils = {
  isImage: (mimeType: string): boolean => mimeType.startsWith("image/"),
  isPDF: (mimeType: string): boolean => mimeType === "application/pdf",
  isText: (mimeType: string): boolean =>
    mimeType.startsWith("text/") || mimeType === "text/csv",
  supportsNativeVision: (mimeType: string): boolean =>
    FileTypeUtils.isImage(mimeType) || mimeType === "application/pdf",
};
