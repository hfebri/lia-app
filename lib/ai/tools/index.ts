/**
 * AI Tools Module
 *
 * This module exports tool definitions and utilities for OpenAI's
 * hosted tools and custom function calling.
 */

import type { ToolDefinition } from "../types";
import { webSearchTool, shouldEnableWebSearch } from "./web-search";
import { fileSearchTool, shouldEnableFileSearch } from "./file-search";

// Export individual tools
export { webSearchTool, fileSearchTool };

// Export utility functions
export { shouldEnableWebSearch, shouldEnableFileSearch };

/**
 * Get tools based on options and context
 *
 * @param options - Configuration options for tool selection
 * @returns Array of enabled tools
 */
export function getEnabledTools(options?: {
  enable_web_search?: boolean;
  enable_file_search?: boolean;
  hasDocuments?: boolean;
}): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // Add web search tool if enabled
  if (shouldEnableWebSearch(options)) {
    tools.push(webSearchTool);
  }

  // Add file search tool if enabled
  if (shouldEnableFileSearch(options)) {
    tools.push(fileSearchTool);
  }

  return tools;
}

/**
 * Check if any tools are enabled
 */
export function hasEnabledTools(options?: {
  enable_web_search?: boolean;
  enable_file_search?: boolean;
  hasDocuments?: boolean;
}): boolean {
  return getEnabledTools(options).length > 0;
}
