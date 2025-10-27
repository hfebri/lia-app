import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIGenerationOptions,
  AIProviderName,
  AIServiceConfig,
  AIError,
} from "./types";

import { ReplicateProvider } from "./providers/replicate";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";

export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private config: AIServiceConfig;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = {
      defaultProvider: "openai",
      providers: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || "",
          models: ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-pro"],
          defaultModel: "gpt-5",
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY || "",
          models: ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001", "claude-opus-4-1-20250805"],
          defaultModel: "claude-sonnet-4-5-20250929",
        },
        replicate: {
          apiKey: process.env.REPLICATE_API_TOKEN || "",
          models: [
            "anthropic/claude-4-sonnet",
            "anthropic/claude-4.5-sonnet",
            "anthropic/claude-4.5-haiku",
            "deepseek-ai/deepseek-r1",
          ],
          defaultModel: "anthropic/claude-4.5-sonnet",
        },
      },
      ...config,
    };

    this.initializeProviders();

  }

  private initializeProviders() {
    // Initialize OpenAI provider
    if (this.config.providers.openai?.apiKey) {
      try {
        const openaiProvider = OpenAIProvider.create();
        this.providers.set("openai", openaiProvider);

      } catch (error) {
        console.error("Failed to initialize OpenAI provider:", error);
      }
    }

    // Initialize Anthropic provider
    if (this.config.providers.anthropic?.apiKey) {
      try {
        const anthropicProvider = AnthropicProvider.create();
        this.providers.set("anthropic", anthropicProvider);

      } catch (error) {
        console.error("Failed to initialize Anthropic provider:", error);
      }
    }

    // Initialize Replicate provider
    if (this.config.providers.replicate?.apiKey) {
      try {
        const replicateProvider = ReplicateProvider.create();
        this.providers.set("replicate", replicateProvider);

      } catch (error) {
        console.error("Failed to initialize Replicate provider:", error);
      }
    }
  }

  /**
   * Generate a response using the specified provider or default
   */
  async generateResponse(
    messages: AIMessage[],
    options: AIGenerationOptions & { provider?: AIProviderName } = {}
  ): Promise<AIResponse> {

    const providerName = options.provider || this.config.defaultProvider;
    const provider = this.getProvider(providerName);

    if (!provider) {
      throw new Error(`Provider "${providerName}" not available`);
    }

    // Set default model for the provider if not specified
    const providerConfig = this.config.providers[providerName];

    const finalOptions = {
      ...options,
      model: options.model || providerConfig?.defaultModel,
    };

    try {
      const result = await provider.generateResponse(messages, finalOptions);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate a streaming response
   */
  async *generateStream(
    messages: AIMessage[],
    options: AIGenerationOptions & { provider?: AIProviderName } = {}
  ): AsyncGenerator<AIStreamChunk> {
    const providerName = options.provider || this.config.defaultProvider;
    const provider = this.getProvider(providerName);

    if (!provider) {
      throw new Error(`Provider "${providerName}" not available`);
    }

    // Set default model for the provider if not specified
    const providerConfig = this.config.providers[providerName];
    const finalOptions = {
      ...options,
      model: options.model || providerConfig?.defaultModel,
    };

    yield* provider.generateStream(messages, finalOptions);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(providerName?: string): string[] {
    const name = providerName || this.config.defaultProvider;
    const provider = this.providers.get(name);
    return provider?.models || [];
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Get provider instance with strict provider routing (no fallbacks)
   */
  private getProvider(providerName: string): AIProvider | undefined {
    const provider = this.providers.get(providerName);

    // Strict provider routing - always throw error if requested provider is not available
    if (!provider) {

      if (providerName === "openai") {
        throw new Error(
          "OpenAI provider not initialized. Please check your OPENAI_API_KEY configuration."
        );
      } else if (providerName === "anthropic") {
        throw new Error(
          "Anthropic provider not initialized. Please check your ANTHROPIC_API_KEY configuration."
        );
      } else if (providerName === "replicate") {
        throw new Error(
          "Replicate provider not initialized. Please check your REPLICATE_API_TOKEN configuration."
        );
      } else {
        throw new Error(
          `${providerName} provider not available. Please check your configuration.`
        );
      }
    }

    return provider;
  }

  /**
   * Create a simple chat completion (convenience method)
   */
  async chat(
    userMessage: string,
    options: {
      systemPrompt?: string;
      conversationHistory?: AIMessage[];
      provider?: AIProviderName;
      model?: string;
    } = {}
  ): Promise<string> {
    const messages: AIMessage[] = [];

    // Add conversation history if provided
    if (options.conversationHistory) {
      messages.push(...options.conversationHistory);
    }

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    const response = await this.generateResponse(messages, {
      system_prompt: options.systemPrompt,
      provider: options.provider,
      model: options.model,
    });

    return response.content;
  }
}

// Global AI service instance
let aiServiceInstance: AIService | null = null;

/**
 * Get the global AI service instance
 */
export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();

  }
  return aiServiceInstance;
}

/**
 * Helper function to create a message
 */
export function createMessage(
  role: "user" | "assistant" | "system",
  content: string
): AIMessage {
  return {
    role,
    content,
    timestamp: new Date(),
  };
}

// Re-export types for convenience
export type {
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIGenerationOptions,
  AIProvider,
  AIProviderName,
  AIError,
} from "./types";
