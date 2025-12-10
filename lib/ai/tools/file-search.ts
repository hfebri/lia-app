import type { ToolDefinition } from "../types";

/**
 * File Search Tool Definition
 *
 * OpenAI's custom file search tool allows the model to search through
 * uploaded files and documents to answer questions based on their content.
 *
 * Features:
 * - Search across multiple document types (PDF, DOCX, TXT, etc.)
 * - Semantic search capabilities
 * - Citation tracking for sources
 * - Useful for document Q&A and analysis
 */
export const fileSearchTool: ToolDefinition = {
  type: "custom",
  custom: {
    name: "file_search",
    description:
      "Search through uploaded documents and files to find relevant information and answer questions",
  },
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
