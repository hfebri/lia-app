import type { ToolDefinition } from "../types";

/**
 * Web Search Tool Definition
 *
 * OpenAI's hosted web search tool (web_search_preview) allows the model
 * to search the web for real-time information to answer user queries.
 *
 * This is a hosted tool provided by OpenAI - no implementation needed.
 * The model will automatically invoke this tool when it needs to search
 * for current information beyond its training data.
 *
 * Features:
 * - Real-time web search capabilities
 * - Automatic citation and source tracking
 * - Reduces hallucinations by grounding in real data
 * - No additional configuration required
 */
export const webSearchTool: ToolDefinition = {
  type: "web_search_preview",
};

/**
 * Check if web search should be enabled based on options
 */
export function shouldEnableWebSearch(options?: {
  enable_web_search?: boolean;
}): boolean {
  // Default to true unless explicitly disabled
  return options?.enable_web_search !== false;
}
