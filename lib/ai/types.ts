// AI service type definitions for unified interface across providers

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
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

export type AIProviderName = "replicate" | "openai" | "anthropic" | "gemini";

export interface AIError extends Error {
  provider: string;
  model?: string;
  code?: string;
  details?: any;
}
