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
 */
export const DEFAULT_TOKEN_LIMITS: TokenLimits = {
  maxContextTokens: 200000, // Conservative limit (most models support 200K-1M)
  reservedTokens: 10000,    // Reserve for system prompts, formatting, response
  maxFileTokens: 150000,    // Max tokens for all file content combined
  maxHistoryTokens: 40000,  // Max tokens for conversation history
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
