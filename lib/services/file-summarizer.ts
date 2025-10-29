/**
 * File Summarization Service
 *
 * Uses Claude Haiku 4.5 to generate concise summaries of large file content.
 * Reduces token usage in conversation context while preserving key information.
 */

import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { estimateTokenCount, truncateToTokenLimit } from "@/lib/utils/token-estimation";

/**
 * Minimum token count to trigger summarization
 * Files below this threshold are used in full
 */
const SUMMARIZATION_THRESHOLD_TOKENS = 10000;

/**
 * Target compression ratio for summaries (5-10% of original)
 */
const TARGET_SUMMARY_RATIO = 0.08; // 8% of original

/**
 * Maximum time to wait for summarization (30 seconds)
 */
const SUMMARIZATION_TIMEOUT_MS = 30000;

/**
 * Model to use for summarization
 */
const SUMMARIZATION_MODEL = "claude-haiku-4-5-20251001";

/**
 * Result of file summarization
 */
export interface SummaryResult {
  summary: string;
  originalTokens: number;
  summaryTokens: number;
  skipped: boolean;
  error?: string;
}

/**
 * File type categories for specialized prompts
 */
type FileType = "spreadsheet" | "document" | "code" | "unknown";

/**
 * Determine file type from MIME type or extension
 */
function getFileType(fileName: string, mimeType?: string): FileType {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType?.toLowerCase() || "";

  // Spreadsheet files
  if (
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerMime.includes("spreadsheet") ||
    lowerMime.includes("csv")
  ) {
    return "spreadsheet";
  }

  // Code files
  if (
    lowerName.endsWith(".js") ||
    lowerName.endsWith(".ts") ||
    lowerName.endsWith(".tsx") ||
    lowerName.endsWith(".jsx") ||
    lowerName.endsWith(".py") ||
    lowerName.endsWith(".java") ||
    lowerName.endsWith(".cpp") ||
    lowerName.endsWith(".c") ||
    lowerName.endsWith(".go") ||
    lowerName.endsWith(".rs") ||
    lowerName.endsWith(".rb") ||
    lowerName.endsWith(".php")
  ) {
    return "code";
  }

  // Document files
  if (
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx") ||
    lowerMime.includes("text") ||
    lowerMime.includes("document")
  ) {
    return "document";
  }

  return "unknown";
}

/**
 * Get file-type-specific summarization prompt
 */
function getSummarizationPrompt(fileType: FileType, targetTokens: number): string {
  const baseInstructions = `Keep your summary under ${targetTokens} tokens while preserving the most critical information.`;

  switch (fileType) {
    case "spreadsheet":
      return `Analyze this CSV/spreadsheet data and provide a concise summary including:
1. Schema (column names and their data types)
2. Row count and dimensions (number of rows and columns)
3. Key statistics (value ranges, unique counts, distributions for important columns)
4. Sample rows (show first 2-3 representative rows)
5. Notable patterns, outliers, or data quality issues

${baseInstructions}`;

    case "document":
      return `Summarize this document including:
1. Main topics and themes
2. Key points and important takeaways
3. Document structure (sections, headings if present)
4. Important facts: dates, names, numbers, or specific details
5. Overall purpose or conclusion

${baseInstructions}`;

    case "code":
      return `Summarize this code file including:
1. Primary purpose and functionality of the code
2. Main functions, classes, or components and their roles
3. Key dependencies or imports used
4. Notable patterns, algorithms, or architecture decisions
5. Any important configuration or constants

${baseInstructions} Be technical but concise.`;

    default:
      return `Provide a concise summary of this file content including:
1. Main content and purpose
2. Key information or data points
3. Structure and organization
4. Notable details worth preserving

${baseInstructions}`;
  }
}

/**
 * Summarize file content using Claude Haiku 4.5
 *
 * @param content - The file content to summarize
 * @param fileName - Name of the file (used for type detection)
 * @param mimeType - Optional MIME type for better type detection
 * @returns Summary result with token counts
 */
export async function summarizeFileContent(
  content: string,
  fileName: string,
  mimeType?: string
): Promise<SummaryResult> {
  const startTime = Date.now();
  const originalTokens = estimateTokenCount(content);

  // Skip summarization if content is below threshold
  if (originalTokens < SUMMARIZATION_THRESHOLD_TOKENS) {
    console.log(`[File Summarizer] Skipped: ${fileName} (${originalTokens} tokens < ${SUMMARIZATION_THRESHOLD_TOKENS} threshold)`);
    return {
      summary: content,
      originalTokens,
      summaryTokens: originalTokens,
      skipped: true,
    };
  }

  try {
    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not found in environment");
    }

    // Determine file type and get appropriate prompt
    const fileType = getFileType(fileName, mimeType);
    const targetTokens = Math.ceil(originalTokens * TARGET_SUMMARY_RATIO);
    const prompt = getSummarizationPrompt(fileType, targetTokens);

    // Create Anthropic provider
    const provider = new AnthropicProvider(apiKey);

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Summarization timeout")), SUMMARIZATION_TIMEOUT_MS);
    });

    // Call summarization API
    const summaryPromise = provider.generateResponse(
      [
        {
          role: "user",
          content: `${prompt}\n\n---\n\nFile: ${fileName}\n\n${content}`,
        },
      ],
      {
        model: SUMMARIZATION_MODEL,
        max_tokens: Math.min(4096, targetTokens * 2), // Allow some buffer
        temperature: 0.3, // Lower temperature for more focused summaries
      }
    );

    // Race between API call and timeout
    const response = await Promise.race([summaryPromise, timeoutPromise]);

    const summary = response.content;
    const summaryTokens = estimateTokenCount(summary);
    const compressionRatio = ((1 - summaryTokens / originalTokens) * 100).toFixed(1);
    const latency = Date.now() - startTime;

    console.log(`[File Summarizer] Success:`, {
      fileName,
      originalTokens,
      summaryTokens,
      compressionRatio: `${compressionRatio}%`,
      latency: `${latency}ms`,
    });

    return {
      summary,
      originalTokens,
      summaryTokens,
      skipped: false,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error(`[File Summarizer] Error:`, {
      fileName,
      error: errorMessage,
      latency: `${latency}ms`,
    });

    // Fallback to truncation
    // IMPORTANT: Set skipped: false so client uses the truncated text
    // Otherwise the full original text flows into context during outages
    const targetTokens = Math.ceil(originalTokens * TARGET_SUMMARY_RATIO);
    const truncationResult = truncateToTokenLimit(content, targetTokens, true);

    return {
      summary: truncationResult.text,
      originalTokens,
      summaryTokens: estimateTokenCount(truncationResult.text),
      skipped: false, // Use the truncated text as a fallback summary
      error: errorMessage,
    };
  }
}

/**
 * Batch summarize multiple files
 *
 * @param files - Array of files to summarize
 * @returns Array of summary results
 */
export async function summarizeMultipleFiles(
  files: Array<{ content: string; fileName: string; mimeType?: string }>
): Promise<SummaryResult[]> {
  const results: SummaryResult[] = [];

  // Process files sequentially to avoid rate limits
  for (const file of files) {
    const result = await summarizeFileContent(
      file.content,
      file.fileName,
      file.mimeType
    );
    results.push(result);
  }

  return results;
}
