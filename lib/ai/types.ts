// AI service type definitions for unified interface across providers

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  files?: Array<{
    name: string;
    type: string;
    size?: number;
    data?: string;
    url?: string;
  }>;
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
