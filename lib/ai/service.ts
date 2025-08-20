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
import { MockProvider } from "./providers/mock";

export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private config: AIServiceConfig;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = {
      defaultProvider: "replicate",
      providers: {
        replicate: {
          apiKey: process.env.REPLICATE_API_TOKEN || "",
          models: ["openai/gpt-5"],
          defaultModel: "openai/gpt-5",
        },
      },
      ...config,
    };

    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize Replicate provider
    if (this.config.providers.replicate?.apiKey) {
      try {
        const replicateProvider = ReplicateProvider.create();
        this.providers.set("replicate", replicateProvider);
        console.log("✅ Replicate provider initialized");
      } catch (error) {
        console.error("❌ Failed to initialize Replicate provider:", error);
      }
    } else {
      // Initialize mock provider for testing when no API key is available
      console.log(
        "🧪 No REPLICATE_API_TOKEN found, initializing mock provider for testing"
      );
      const mockProvider = new MockProvider();
      this.providers.set("replicate", mockProvider);
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

    return provider.generateResponse(messages, finalOptions);
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
   * Get provider instance
   */
  private getProvider(providerName: string): AIProvider | undefined {
    return this.providers.get(providerName);
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
