import Replicate from "replicate";
import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIGenerationOptions,
  AIError,
} from "../types";

export class ReplicateProvider implements AIProvider {
  public readonly name = "replicate";
  public readonly models = ["openai/gpt-5"];
  private client: Replicate;

  constructor(apiToken: string) {
    this.client = new Replicate({
      auth: apiToken,
    });
  }

  async generateResponse(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    try {
      const {
        model = "openai/gpt-5",
        temperature = 0.7,
        max_tokens = 1000,
        top_p = 1,
        system_prompt,
      } = options;

      // Convert messages to the format expected by GPT-5
      const formattedMessages = this.formatMessages(messages, system_prompt);

      const input = {
        messages: formattedMessages,
        temperature,
        max_tokens,
        top_p,
      };

      console.log("Replicate API request:", { model, input });

      const output = await this.client.run(model as any, { input });

      // Handle the response - Replicate returns an array of content
      const content = Array.isArray(output) ? output.join("") : String(output);

      return {
        content: content.trim(),
        model,
        provider: this.name,
        usage: {
          prompt_tokens: 0, // Replicate doesn't provide token counts
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    } catch (error) {
      console.error("Replicate API error:", error);
      throw this.handleError(error, options.model);
    }
  }

  async *generateStream(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): AsyncGenerator<AIStreamChunk> {
    try {
      const {
        model = "openai/gpt-5",
        temperature = 0.7,
        max_tokens = 1000,
        top_p = 1,
        system_prompt,
      } = options;

      // Convert messages to the format expected by GPT-5
      const formattedMessages = this.formatMessages(messages, system_prompt);

      const input = {
        messages: formattedMessages,
        temperature,
        max_tokens,
        top_p,
      };

      console.log("Replicate streaming request:", { model, input });

      // For streaming, we use the stream method
      const stream = await this.client.stream(model as any, { input });

      let accumulatedContent = "";

      for await (const event of stream) {
        if (event.data) {
          const chunk = String(event.data);
          accumulatedContent += chunk;

          yield {
            content: chunk,
            isComplete: false,
          };
        }
      }

      // Final chunk
      yield {
        content: "",
        isComplete: true,
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    } catch (error) {
      console.error("Replicate streaming error:", error);
      throw this.handleError(error, options.model);
    }
  }

  private formatMessages(messages: AIMessage[], systemPrompt?: string) {
    const formatted = [];

    // Add system prompt if provided
    if (systemPrompt) {
      formatted.push({
        role: "system",
        content: systemPrompt,
      });
    }

    // Add conversation messages
    for (const message of messages) {
      formatted.push({
        role: message.role,
        content: message.content,
      });
    }

    return formatted;
  }

  private handleError(error: any, model?: string): AIError {
    const aiError = new Error(
      error.message || "Unknown Replicate API error"
    ) as AIError;

    aiError.provider = this.name;
    aiError.model = model;
    aiError.code = error.status || error.code || "UNKNOWN_ERROR";
    aiError.details = error;

    return aiError;
  }

  // Static method to create provider instance
  static create(): ReplicateProvider {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      throw new Error("REPLICATE_API_TOKEN environment variable is required");
    }
    return new ReplicateProvider(apiToken);
  }
}
