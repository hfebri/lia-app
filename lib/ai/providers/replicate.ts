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
  public readonly models = [
    "anthropic/claude-4-sonnet",
    "anthropic/claude-4.5-sonnet",
    "anthropic/claude-4.5-haiku",
    "deepseek-ai/deepseek-r1",
  ];
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
        model = "anthropic/claude-4.5-sonnet",
        temperature = 0.7,
        max_tokens = 1000,
        top_p = 1,
        system_prompt,
        extended_thinking = false,
        thinking_budget_tokens = 1024,
        max_image_resolution = 0.5,
        reasoning_effort = "medium",
      } = options;


      // Build input based on model type
      let input: any;

      if (this.isClaudeModel(model)) {
        const latestUserMessage = messages.filter(
          (msg) => msg.role === "user"
        ).pop();
        const hasImage =
          latestUserMessage?.files && latestUserMessage.files.length > 0;

        input = {
          prompt: this.buildClaudePrompt(messages),
          max_tokens,
          system_prompt: system_prompt || "You are a helpful assistant",
          extended_thinking,
          thinking_budget_tokens,
        };

        if (hasImage && latestUserMessage?.files?.[0]) {
          const file = latestUserMessage.files[0];
          input.image = (file as any).url || file.data;
          input.max_image_resolution = max_image_resolution;
        }
      } else {
        // For other models (DeepSeek), use the original format
        const formattedMessages = this.formatMessages(messages, system_prompt);
        input = {
          messages: formattedMessages,
          temperature,
          max_tokens,
          top_p,
        };
      }

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
      throw this.handleError(error, options.model);
    }
  }

  async *generateStream(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): AsyncGenerator<AIStreamChunk> {
    try {
      const {
        model = "anthropic/claude-4.5-sonnet",
        temperature = 0.7,
        max_tokens = 1000,
        top_p = 1,
        system_prompt,
        extended_thinking = false,
        thinking_budget_tokens = 1024,
        max_image_resolution = 0.5,
        reasoning_effort = "medium",
      } = options;

      // Build input based on model type
      let input: any;

      if (this.isClaudeModel(model)) {
        const latestUserMessage = messages.filter(
          (msg) => msg.role === "user"
        ).pop();
        const hasImage =
          latestUserMessage?.files && latestUserMessage.files.length > 0;

        input = {
          prompt: this.buildClaudePrompt(messages),
          max_tokens,
          system_prompt: system_prompt || "You are a helpful assistant",
          extended_thinking,
          thinking_budget_tokens,
        };

        if (hasImage && latestUserMessage?.files?.[0]) {
          const file = latestUserMessage.files[0];
          input.image = (file as any).url || file.data;
          input.max_image_resolution = max_image_resolution;
        }
      } else {
        // For other models (DeepSeek), use the original format
        const formattedMessages = this.formatMessages(messages, system_prompt);
        input = {
          messages: formattedMessages,
          temperature,
          max_tokens,
          top_p,
        };
      }

      // For streaming, we use the stream method
      const stream = await this.client.stream(model as any, { input });

      let accumulatedContent = "";

      for await (const event of stream) {
        if (event.data) {
          const chunk = String(event.data);

          // Filter out empty chunks and chunks that are just "{}"
          const trimmedChunk = chunk.trim();
          if (
            trimmedChunk &&
            trimmedChunk !== "{}" &&
            trimmedChunk !== '""' &&
            trimmedChunk !== "null"
          ) {
            accumulatedContent += chunk;

            yield {
              content: chunk,
              isComplete: false,
            };
          }
        }
      }

      // Final chunk with actual final content (no empty content)
      if (accumulatedContent.trim()) {
        yield {
          content: "",
          isComplete: true,
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        };
      }
    } catch (error) {
      throw this.handleError(error, options.model);
    }
  }

  private isClaudeModel(model: string): boolean {
    return model.includes("claude");
  }

  private buildClaudePrompt(messages: AIMessage[]) {
    const segments: string[] = [];

    messages.forEach((message) => {
      if (message.role === "system") {
        return;
      }

      const roleLabel = message.role === "assistant" ? "Assistant" : "Human";
      segments.push(`${roleLabel}: ${message.content}`);
    });

    segments.push("Assistant:");

    return segments.join("\n\n");
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
