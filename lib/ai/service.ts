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
import { GeminiProvider } from "./providers/gemini";
import { MockProvider } from "./providers/mock";

export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private config: AIServiceConfig;

  constructor(config?: Partial<AIServiceConfig>) {
    console.log("🏗️ AI SERVICE CONSTRUCTOR DEBUG: Constructor called");
    console.log(
      "🏗️ AI SERVICE CONSTRUCTOR DEBUG: Environment variables check:"
    );
    console.log(
      "🏗️ AI SERVICE CONSTRUCTOR DEBUG: REPLICATE_API_TOKEN:",
      !!process.env.REPLICATE_API_TOKEN
    );
    console.log(
      "🏗️ AI SERVICE CONSTRUCTOR DEBUG: GEMINI_API_KEY:",
      !!process.env.GEMINI_API_KEY
    );
    console.log(
      "🏗️ AI SERVICE CONSTRUCTOR DEBUG: GEMINI_API_KEY length:",
      process.env.GEMINI_API_KEY?.length || 0
    );

    this.config = {
      defaultProvider: "replicate",
      providers: {
        replicate: {
          apiKey: process.env.REPLICATE_API_TOKEN || "",
          models: ["openai/gpt-5"],
          defaultModel: "openai/gpt-5",
        },
        gemini: {
          apiKey: process.env.GEMINI_API_KEY || "",
          models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
          defaultModel: "gemini-2.5-flash",
        },
      },
      ...config,
    };

    console.log(
      "🏗️ AI SERVICE CONSTRUCTOR DEBUG: Final config:",
      JSON.stringify(this.config, null, 2)
    );
    console.log(
      "🏗️ AI SERVICE CONSTRUCTOR DEBUG: About to initialize providers..."
    );
    this.initializeProviders();
    console.log("🏗️ AI SERVICE CONSTRUCTOR DEBUG: Providers initialized");
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

    // Initialize Gemini provider
    if (this.config.providers.gemini?.apiKey) {
      try {
        const geminiProvider = GeminiProvider.create();
        this.providers.set("gemini", geminiProvider);
        console.log("✅ Gemini provider initialized");
      } catch (error) {
        console.error("❌ Failed to initialize Gemini provider:", error);
      }
    } else {
      console.log("🧪 No GEMINI_API_KEY found, Gemini provider not available");
    }
  }

  /**
   * Generate a response using the specified provider or default
   */
  async generateResponse(
    messages: AIMessage[],
    options: AIGenerationOptions & { provider?: AIProviderName } = {}
  ): Promise<AIResponse> {
    console.log("🚀 AI SERVICE DEBUG: generateResponse called");
    console.log(
      "🚀 AI SERVICE DEBUG: Input options:",
      JSON.stringify(options, null, 2)
    );
    console.log("🚀 AI SERVICE DEBUG: Input messages count:", messages.length);

    const providerName = options.provider || this.config.defaultProvider;
    console.log("🚀 AI SERVICE DEBUG: Selected provider:", providerName);
    console.log(
      "🚀 AI SERVICE DEBUG: Available providers:",
      Array.from(this.providers.keys())
    );

    const provider = this.getProvider(providerName);
    console.log("🚀 AI SERVICE DEBUG: Provider found:", !!provider);
    console.log("🚀 AI SERVICE DEBUG: Provider name:", provider?.name);

    if (!provider) {
      console.error("🚀 AI SERVICE DEBUG: Provider not available!");
      throw new Error(`Provider "${providerName}" not available`);
    }

    // Set default model for the provider if not specified
    const providerConfig = this.config.providers[providerName];
    console.log(
      "🚀 AI SERVICE DEBUG: Provider config:",
      JSON.stringify(providerConfig, null, 2)
    );

    const finalOptions = {
      ...options,
      model: options.model || providerConfig?.defaultModel,
    };
    console.log(
      "🚀 AI SERVICE DEBUG: Final options:",
      JSON.stringify(finalOptions, null, 2)
    );

    console.log(
      "🚀 AI SERVICE DEBUG: About to call provider.generateResponse..."
    );
    try {
      const result = await provider.generateResponse(messages, finalOptions);
      console.log(
        "🚀 AI SERVICE DEBUG: Provider response received successfully"
      );
      console.log(
        "🚀 AI SERVICE DEBUG: Response content length:",
        result.content?.length || 0
      );
      return result;
    } catch (error) {
      console.error(
        "🚀 AI SERVICE DEBUG: Provider generateResponse failed:",
        error
      );
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
  console.log("🏭 AI SERVICE FACTORY DEBUG: getAIService called");
  console.log(
    "🏭 AI SERVICE FACTORY DEBUG: Existing instance:",
    !!aiServiceInstance
  );

  if (!aiServiceInstance) {
    console.log(
      "🏭 AI SERVICE FACTORY DEBUG: Creating new AIService instance..."
    );
    aiServiceInstance = new AIService();
    console.log("🏭 AI SERVICE FACTORY DEBUG: AIService instance created");
  }

  console.log("🏭 AI SERVICE FACTORY DEBUG: Returning AIService instance");
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
