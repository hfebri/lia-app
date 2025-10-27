import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIGenerationOptions,
  AIError,
} from "../types";

/**
 * Anthropic Provider
 *
 * Direct integration with Anthropic API using official Node.js SDK.
 * Supports Claude models with native vision, PDF processing, and streaming.
 *
 * Features:
 * - Native image processing (JPEG, PNG, GIF, WebP)
 * - Native PDF document processing (up to 30MB per file)
 * - Streaming responses
 * - Multi-turn conversations
 * - Extended thinking capabilities
 * - Temperature and top_p support
 */
export class AnthropicProvider implements AIProvider {
  public readonly name = "anthropic";
  public readonly models = [
    "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-1-20250805",
  ];
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Generate a non-streaming response
   */
  async generateResponse(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    try {
      const {
        model = "claude-sonnet-4-5-20250929",
        max_tokens = 8192,
        temperature = 1,
        top_p,
        system_prompt,
        extended_thinking,
        thinking_budget_tokens,
        enable_web_search,
      } = options;

      // Format messages for Anthropic API
      const formattedMessages = this.formatMessages(messages);

      // Build request parameters
      const requestParams: Anthropic.MessageCreateParams = {
        model,
        messages: formattedMessages,
        max_tokens,
        temperature,
      };

      // Add system prompt if provided
      if (system_prompt) {
        requestParams.system = system_prompt;
      }

      // Add top_p if provided
      if (top_p !== undefined) {
        requestParams.top_p = top_p;
      }

      // Add extended thinking if enabled
      if (extended_thinking && thinking_budget_tokens) {
        (requestParams as any).thinking = {
          type: "enabled",
          budget_tokens: Math.max(thinking_budget_tokens, 1024), // Minimum 1024
        };
      }

      // Add web search tool if enabled
      if (enable_web_search) {
        requestParams.tools = this.getWebSearchTool();
      }

      // Create completion
      const message = await this.client.messages.create(requestParams);

      // Extract content from response
      const textContent = message.content.find(
        (block) => block.type === "text"
      );
      const content = textContent && "text" in textContent ? textContent.text : "";

      return {
        content: content.trim(),
        model,
        provider: this.name,
        usage: {
          prompt_tokens: message.usage.input_tokens,
          completion_tokens: message.usage.output_tokens,
          total_tokens: message.usage.input_tokens + message.usage.output_tokens,
        },
      };
    } catch (error) {
      throw this.handleError(error, options.model);
    }
  }

  /**
   * Generate a streaming response
   */
  async *generateStream(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): AsyncGenerator<AIStreamChunk> {
    try {
      const {
        model = "claude-sonnet-4-5-20250929",
        max_tokens = 8192,
        temperature = 1,
        top_p,
        system_prompt,
        extended_thinking,
        thinking_budget_tokens,
        enable_web_search,
      } = options;

      // Format messages for Anthropic API
      const formattedMessages = this.formatMessages(messages);

      // Build request parameters
      const requestParams: Anthropic.MessageCreateParams = {
        model,
        messages: formattedMessages,
        max_tokens,
        temperature,
        stream: true,
      };

      // Add system prompt if provided
      if (system_prompt) {
        requestParams.system = system_prompt;
      }

      // Add top_p if provided
      if (top_p !== undefined) {
        requestParams.top_p = top_p;
      }

      // Add extended thinking if enabled
      if (extended_thinking && thinking_budget_tokens) {
        (requestParams as any).thinking = {
          type: "enabled",
          budget_tokens: Math.max(thinking_budget_tokens, 1024), // Minimum 1024
        };
      }

      // Add web search tool if enabled
      if (enable_web_search) {
        requestParams.tools = this.getWebSearchTool();
      }

      // Create streaming completion
      const stream = await this.client.messages.create(requestParams);

      let totalTokens = 0;
      let promptTokens = 0;
      let completionTokens = 0;

      // Stream chunks
      for await (const event of stream) {
        // Handle content block delta (text chunks)
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield {
            content: event.delta.text,
            isComplete: false,
          };
        }

        // Handle message completion with usage stats
        if (event.type === "message_stop") {
          yield {
            content: "",
            isComplete: true,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
            },
          };
        }

        // Capture usage information
        if (event.type === "message_start" && "message" in event) {
          promptTokens = event.message.usage.input_tokens;
          completionTokens = event.message.usage.output_tokens;
          totalTokens = promptTokens + completionTokens;
        }

        // Update usage on delta if available
        if (event.type === "message_delta" && "usage" in event) {
          completionTokens = event.usage.output_tokens;
          totalTokens = promptTokens + completionTokens;
        }
      }
    } catch (error) {
      throw this.handleError(error, options.model);
    }
  }

  /**
   * Format messages for Anthropic API
   *
   * Converts AIMessage format to Anthropic's expected format,
   * handling text, images, and PDF documents.
   */
  private formatMessages(
    messages: AIMessage[]
  ): Anthropic.MessageParam[] {
    const formatted: Anthropic.MessageParam[] = [];

    for (const message of messages) {
      // Skip system messages (handled separately via system parameter)
      if (message.role === "system") {
        continue;
      }

      // Check if message has files
      const hasFiles = message.files && message.files.length > 0;

      if (hasFiles && message.role === "user") {
        // User message with files - use content array format
        const content: Anthropic.MessageParam["content"] = [];

        // Add text content first
        if (message.content) {
          content.push({
            type: "text",
            text: message.content,
          });
        }

        // Add files (images and PDFs)
        for (const file of message.files || []) {
          if (this.isImageFile(file.type)) {
            // Handle images
            const imageSource = this.getFileSource(file);
            if (imageSource) {
              content.push({
                type: "image",
                source: imageSource,
              });
            }
          } else if (this.isPDFFile(file.type)) {
            // Handle PDF documents
            const documentSource = this.getFileSource(file);
            if (documentSource) {
              content.push({
                type: "document",
                source: documentSource,
              });
            }
          }
        }

        formatted.push({
          role: "user",
          content,
        });
      } else {
        // Text-only message
        formatted.push({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        });
      }
    }

    return formatted;
  }

  /**
   * Get file source for Anthropic API
   */
  private getFileSource(file: {
    type: string;
    data?: string;
    url?: string;
  }): Anthropic.ImageBlockParam["source"] | Anthropic.DocumentBlockParam["source"] | null {
    // Prefer base64 data
    if (file.data) {
      return {
        type: "base64",
        media_type: file.type as Anthropic.ImageBlockParam["source"]["media_type"],
        data: file.data,
      };
    }

    // Fallback to URL if available
    if (file.url) {
      return {
        type: "url",
        url: file.url,
      };
    }

    return null;
  }

  /**
   * Check if file type is an image
   */
  private isImageFile(mimeType: string): boolean {
    return (
      mimeType === "image/jpeg" ||
      mimeType === "image/png" ||
      mimeType === "image/gif" ||
      mimeType === "image/webp"
    );
  }

  /**
   * Check if file type is a PDF
   */
  private isPDFFile(mimeType: string): boolean {
    return mimeType === "application/pdf";
  }

  /**
   * Get web search tool definition
   * Note: This is a placeholder for web search functionality
   * Actual implementation may require beta access or specific API version
   */
  private getWebSearchTool(): Anthropic.Tool[] {
    return [
      {
        name: "web_search",
        description: "Search the web for current information, news, or answers to questions. Use this when you need up-to-date information or facts that you don't have in your training data.",
        input_schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to look up on the web"
            }
          },
          required: ["query"]
        }
      }
    ];
  }

  /**
   * Handle errors and convert to AIError format
   */
  private handleError(error: any, model?: string): AIError {
    const aiError = new Error(
      error.message || "Unknown Anthropic API error"
    ) as AIError;

    aiError.provider = this.name;
    aiError.model = model;

    // Extract error code from Anthropic error
    if (error.status) {
      aiError.code = `HTTP_${error.status}`;
    } else if (error.error?.type) {
      aiError.code = error.error.type;
    } else {
      aiError.code = "UNKNOWN_ERROR";
    }

    aiError.details = error;

    return aiError;
  }

  /**
   * Static factory method to create provider instance
   */
  static create(): AnthropicProvider {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    return new AnthropicProvider(apiKey);
  }
}
