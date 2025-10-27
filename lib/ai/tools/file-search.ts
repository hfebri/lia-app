import type { ToolDefinition } from "../types";

/**
 * File Search Tool Definition
 *
 * OpenAI's hosted file search tool allows the model to search through
 * uploaded files and documents to answer questions based on their content.
 *
 * This is a hosted tool provided by OpenAI - no implementation needed.
 * The model will automatically invoke this tool when it needs to find
 * information within uploaded documents.
 *
 * Features:
 * - Search across multiple document types (PDF, DOCX, TXT, etc.)
 * - Semantic search capabilities
 * - Citation tracking for sources
 * - Useful for document Q&A and analysis
 *
 * Note: This tool is currently optional and can be enabled when needed
 * for document-heavy use cases.
 */
export const fileSearchTool: ToolDefinition = {
  type: "file_search",
};

/**
 * Check if file search should be enabled based on options or context
 */
export function shouldEnableFileSearch(options?: {
  enable_file_search?: boolean;
  hasDocuments?: boolean;
}): boolean {
  // Enable if explicitly requested or if documents are present
  return (
    options?.enable_file_search === true ||
    (options?.hasDocuments === true && options?.enable_file_search !== false)
  );
}
