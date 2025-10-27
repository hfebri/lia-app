import type { ToolDefinition } from "../types";

/**
 * Web Search Tool Definition
 *
 * OpenAI's custom web search tool allows the model to search the web
 * for real-time information to answer user queries.
 *
 * Features:
 * - Real-time web search capabilities
 * - Automatic citation and source tracking
 * - Reduces hallucinations by grounding in real data
 */
export const webSearchTool: ToolDefinition = {
  type: "custom",
  custom: {
    name: "web_search",
    description: "Search the web for real-time information and current events",
  },
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
