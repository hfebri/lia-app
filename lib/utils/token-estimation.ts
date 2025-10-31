/**
 * Token estimation utilities
 *
 * Provides rough token counting for managing AI model context windows.
 * Uses approximation: ~3.5 characters = 1 token (average across code/text/data)
 *
 * NOTE: This is a heuristic-based approach. For production use with high accuracy
 * requirements, consider integrating a proper tokenizer library like `tiktoken`.
 * The utility is designed to be pluggable for easy replacement.
 */

/**
 * Configuration flag for tokenizer implementation
 * Set to false when migrating to a proper tokenizer library
 */
export const USE_HEURISTIC_TOKENIZER = true;

/**
 * Token limits for context management
 */
export interface TokenLimits {
  /** Maximum tokens allowed in the entire context */
  maxContextTokens: number;
  /** Reserved tokens for system prompts and formatting */
  reservedTokens: number;
  /** Maximum tokens for file content */
  maxFileTokens: number;
  /** Maximum tokens for conversation history */
  maxHistoryTokens: number;
}

/**
 * Default token limits based on common AI model context windows
 *
 * Model Capabilities (as of 2025):
 * - Claude 4.5 Sonnet: 200K input tokens
 * - GPT-5: 272K input tokens, 128K output tokens (400K total)
 *
 * IMPORTANT: Images sent as base64 consume significant tokens:
 * - A 2048x2048 image ≈ 5,000-7,000 tokens (vision tokens, not text)
 * - Base64 text representation is NOT counted here but IS sent to API
 * - Multiple images can quickly exceed limits
 *
 * For document-heavy workflows with vision:
 * - Conservative limits to account for base64 overhead
 * - Images/PDFs use native vision APIs (counted separately by provider)
 */
export const DEFAULT_TOKEN_LIMITS: TokenLimits = {
  maxContextTokens: 250000, // Increased for GPT-5 (272K input limit)
  reservedTokens: 20000,    // Reserve for system prompts, formatting, response (increased for safety)
  maxFileTokens: 120000,    // REDUCED: Max tokens for extracted text only (not including base64 images)
  maxHistoryTokens: 30000,  // Max tokens for conversation history
};

/**
 * Result of truncation operation
 */
export interface TruncationResult {
  text: string;
  truncated: boolean;
  originalTokens: number;
}

/**
 * File with token information
 */
export interface FileWithTokens {
  name: string;
  content: string;
  timestamp?: number;
  uniqueKey?: string; // Optional unique identifier to handle duplicate filenames
}

/**
 * Result of file content truncation
 */
export interface TruncatedFile {
  name: string;
  content: string;
  originalTokens: number;
  truncatedTokens: number;
  truncated: boolean;
  uniqueKey?: string; // Preserved from input to maintain identity
}

/**
 * Estimate token count from text
 *
 * Uses approximation: ~3.5 characters = 1 token
 * This accounts for:
 * - English text: ~4 chars per token
 * - Code: ~3 chars per token
 * - Numbers/special chars: ~2 chars per token
 * - Average: ~3.5 chars per token
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.5);
}

/**
 * Estimate vision tokens for an image
 *
 * Vision APIs use different token calculations based on image dimensions
 * OpenAI/Anthropic vision tokens: ~170 tokens per 512x512 tile
 *
 * @param file - File object with size information
 * @returns Estimated vision token count
 */
export function estimateImageTokens(file: { size: number; type: string }): number {
  if (!file.type.startsWith("image/")) return 0;

  // Rough estimation based on file size
  // After compression to 2048px max dimension:
  // - Small images (<500KB): ~1,000-2,000 tokens
  // - Medium images (500KB-2MB): ~2,000-5,000 tokens
  // - Large images (2MB-5MB): ~5,000-8,000 tokens
  // - Very large (5MB+): ~8,000-12,000 tokens

  const sizeInMB = file.size / (1024 * 1024);

  if (sizeInMB < 0.5) return 1500;
  if (sizeInMB < 2) return 3500;
  if (sizeInMB < 5) return 6500;
  return 10000; // Cap at 10K for very large images
}

/**
 * Estimate total tokens including text and vision content
 *
 * @param textTokens - Token count from extracted text
 * @param files - Array of file attachments
 * @returns Total estimated token count
 */
export function estimateTotalTokens(
  textTokens: number,
  files: Array<{ size: number; type: string }> = []
): number {
  const imageTokens = files.reduce((sum, file) => {
    return sum + estimateImageTokens(file);
  }, 0);

  return textTokens + imageTokens;
}

/**
 * Truncate text to fit within token limit
 *
 * @param text - Text to truncate
 * @param maxTokens - Maximum tokens allowed
 * @param addEllipsis - Whether to add truncation indicator
 * @returns Truncation result with original token count
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  addEllipsis: boolean = true
): TruncationResult {
  const originalTokens = estimateTokenCount(text);

  if (originalTokens <= maxTokens) {
    return { text, truncated: false, originalTokens };
  }

  // Calculate character limit based on token estimate
  const maxChars = Math.floor(maxTokens * 3.5);
  const ellipsis = addEllipsis ? "\n\n[... content truncated due to length ...]" : "";
  const truncatedText = text.slice(0, Math.max(0, maxChars - ellipsis.length)) + ellipsis;

  return { text: truncatedText, truncated: true, originalTokens };
}

/**
 * Intelligently truncate file content to fit within token budget
 *
 * Prioritizes:
 * 1. Recently uploaded files (keep more content)
 * 2. Files with less content (keep complete if possible)
 * 3. Equal distribution across files if all are large
 *
 * @param files - Array of files with content and optional timestamp
 * @param maxTotalTokens - Maximum total tokens allowed for all files
 * @returns Array of truncated files with token information
 */
export function truncateFileContent(
  files: FileWithTokens[],
  maxTotalTokens: number
): TruncatedFile[] {
  if (files.length === 0) return [];

  // Calculate original token counts
  const filesWithTokens = files.map(file => ({
    ...file,
    tokens: estimateTokenCount(file.content),
    timestamp: file.timestamp || 0,
  }));

  // Calculate total tokens needed
  const totalTokens = filesWithTokens.reduce((sum, f) => sum + f.tokens, 0);

  // If everything fits, return as-is
  if (totalTokens <= maxTotalTokens) {
    return filesWithTokens.map(f => ({
      name: f.name,
      content: f.content,
      originalTokens: f.tokens,
      truncatedTokens: f.tokens,
      truncated: false,
      uniqueKey: f.uniqueKey, // Preserve unique key for duplicate filename handling
    }));
  }

  // Need to truncate - sort by recency (most recent first) and size (smaller first for same time)
  const sortedFiles = [...filesWithTokens].sort((a, b) => {
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp; // Most recent first
    }
    return a.tokens - b.tokens; // Smaller first if same timestamp
  });

  // Allocate tokens per file
  const results: TruncatedFile[] = [];
  let remainingBudget = maxTotalTokens;

  for (let i = 0; i < sortedFiles.length; i++) {
    const file = sortedFiles[i];
    const filesRemaining = sortedFiles.length - i;

    // Allocate proportional share of remaining budget
    // More recent files get larger share (recency weight)
    const recencyWeight = 1 + (sortedFiles.length - i) * 0.2;
    const baseShare = remainingBudget / filesRemaining;
    const allocatedTokens = Math.floor(Math.min(
      file.tokens,
      baseShare * recencyWeight
    ));

    const truncationResult = truncateToTokenLimit(
      file.content,
      allocatedTokens,
      true
    );

    const truncatedTokens = estimateTokenCount(truncationResult.text);

    results.push({
      name: file.name,
      content: truncationResult.text,
      originalTokens: file.tokens,
      truncatedTokens,
      truncated: truncationResult.truncated,
      uniqueKey: file.uniqueKey, // Preserve unique key for duplicate filename handling
    });

    remainingBudget -= truncatedTokens;
  }

  return results;
}

/**
 * Format truncation info for display in UI
 *
 * @param originalTokens - Original token count before truncation
 * @param truncatedTokens - Token count after truncation
 * @returns Formatted string showing percentage kept and token counts
 */
export function formatTruncationInfo(
  originalTokens: number,
  truncatedTokens: number
): string {
  const percentKept = Math.round((truncatedTokens / originalTokens) * 100);
  return `(${percentKept}% of content included, ${originalTokens.toLocaleString()} → ${truncatedTokens.toLocaleString()} tokens)`;
}

/**
 * Model context window limits
 */
export const MODEL_CONTEXT_LIMITS = {
  "claude-4.5-sonnet": {
    maxInputTokens: 200000,
    maxOutputTokens: 64000,
    name: "Claude 4.5 Sonnet",
    bestFor: "High-quality analysis, coding, and reasoning tasks",
  },
  "gpt-5": {
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: "GPT-5",
    bestFor: "Very long documents, extensive analysis, and large context needs",
  },
} as const;

/**
 * Recommend the best AI model for document analysis based on token count
 *
 * @param estimatedTokens - Estimated token count of the document(s)
 * @returns Recommendation object with model ID and reason
 */
export function recommendModelForDocument(estimatedTokens: number): {
  modelId: string;
  modelName: string;
  reason: string;
  warning?: string;
} {
  // Account for reserved tokens (system prompts, formatting, etc.)
  const effectiveTokens = estimatedTokens + DEFAULT_TOKEN_LIMITS.reservedTokens;

  // For very large documents (>190K tokens), use GPT-5
  if (effectiveTokens > 190000) {
    return {
      modelId: "gpt-5",
      modelName: MODEL_CONTEXT_LIMITS["gpt-5"].name,
      reason: `Document size (~${Math.round(estimatedTokens / 1000)}K tokens) exceeds Claude 4.5's limit. GPT-5 supports up to 272K input tokens.`,
      warning: effectiveTokens > 250000
        ? "Document is very large and may still be truncated. Consider summarizing first."
        : undefined,
    };
  }

  // For large documents (150K-190K tokens), recommend GPT-5 but Claude is still viable
  if (effectiveTokens > 150000) {
    return {
      modelId: "gpt-5",
      modelName: MODEL_CONTEXT_LIMITS["gpt-5"].name,
      reason: `Large document (~${Math.round(estimatedTokens / 1000)}K tokens). GPT-5 recommended for better headroom, but Claude 4.5 will also work.`,
    };
  }

  // For normal documents (<150K tokens), Claude 4.5 is preferred for quality
  return {
    modelId: "claude-4.5-sonnet",
    modelName: MODEL_CONTEXT_LIMITS["claude-4.5-sonnet"].name,
    reason: `Document size (~${Math.round(estimatedTokens / 1000)}K tokens) fits well within Claude 4.5's context window. Recommended for best quality.`,
  };
}

/**
 * Get model-specific effective token limit
 *
 * @param modelId - Model identifier
 * @returns Effective token limit after accounting for reserved tokens
 */
export function getEffectiveTokenLimit(modelId: string): number {
  if (modelId.includes("gpt-5")) {
    return MODEL_CONTEXT_LIMITS["gpt-5"].maxInputTokens - DEFAULT_TOKEN_LIMITS.reservedTokens;
  }

  if (modelId.includes("claude")) {
    return MODEL_CONTEXT_LIMITS["claude-4.5-sonnet"].maxInputTokens - DEFAULT_TOKEN_LIMITS.reservedTokens;
  }

  // Default to Claude limits for unknown models
  return MODEL_CONTEXT_LIMITS["claude-4.5-sonnet"].maxInputTokens - DEFAULT_TOKEN_LIMITS.reservedTokens;
}
