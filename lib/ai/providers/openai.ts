import OpenAI from "openai";
import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIGenerationOptions,
  AIError,
} from "../types";
import { getEnabledTools } from "../tools";

/**
 * OpenAI Provider
 *
 * Direct integration with OpenAI API using official Node.js SDK.
 * Supports GPT-5 models with native vision, streaming, and hosted tools.
 *
 * Features:
 * - Native image processing (no OCR needed)
 * - Web search tool integration
 * - File search tool support
 * - Streaming responses
 * - Multi-turn conversations
 */
export class OpenAIProvider implements AIProvider {
  public readonly name = "openai";
  public readonly models = [
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5-pro",
  ];
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
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
        model = "gpt-5",
        temperature = 0.7,
        max_tokens = 8192,
        top_p = 1,
        system_prompt,
      } = options;

      // Format messages for OpenAI API
      const formattedMessages = this.formatMessages(messages, system_prompt);

      // Get enabled tools
      const tools = getEnabledTools({
        enable_web_search: options.enable_web_search,
        enable_file_search: options.enable_file_search,
        hasDocuments: this.hasDocuments(messages),
      });

      // Create completion
      const completion = await this.client.chat.completions.create({
        model,
        messages: formattedMessages,
        temperature,
        max_tokens,
        top_p,
        tools: tools.length > 0 ? (tools as any) : undefined,
      });

      // Extract content from response
      const content = completion.choices[0]?.message?.content || "";

      return {
        content: content.trim(),
        model,
        provider: this.name,
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          total_tokens: completion.usage?.total_tokens || 0,
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
        model = "gpt-5",
        temperature = 0.7,
        max_tokens = 8192,
        top_p = 1,
        system_prompt,
      } = options;

      // Format messages for OpenAI API
      const formattedMessages = this.formatMessages(messages, system_prompt);

      // Get enabled tools
      const tools = getEnabledTools({
        enable_web_search: options.enable_web_search,
        enable_file_search: options.enable_file_search,
        hasDocuments: this.hasDocuments(messages),
      });

      // Create streaming completion
      const stream = await this.client.chat.completions.create({
        model,
        messages: formattedMessages,
        temperature,
        max_tokens,
        top_p,
        tools: tools.length > 0 ? (tools as any) : undefined,
        stream: true,
      });

      let totalTokens = 0;
      let promptTokens = 0;
      let completionTokens = 0;

      // Stream chunks
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || "";

        // Update token counts if available
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens || totalTokens;
          promptTokens = chunk.usage.prompt_tokens || promptTokens;
          completionTokens = chunk.usage.completion_tokens || completionTokens;
        }

        // Only yield non-empty content
        if (content) {
          yield {
            content,
            isComplete: false,
          };
        }

        // Check for completion
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason) {
          // Final chunk with usage stats
          yield {
            content: "",
            isComplete: true,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
            },
          };
          break;
        }
      }
    } catch (error) {
      throw this.handleError(error, options.model);
    }
  }

  /**
   * Format messages for OpenAI API
   *
   * Converts AIMessage format to OpenAI's expected format,
   * handling text, images, and system prompts.
   */
  private formatMessages(
    messages: AIMessage[],
    systemPrompt?: string
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const formatted: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system prompt as first message if provided
    if (systemPrompt) {
      formatted.push({
        role: "system",
        content: systemPrompt,
      });
    }

    // Process each message
    for (const message of messages) {
      if (message.role === "system") {
        // Skip system messages if already added
        if (!systemPrompt) {
          formatted.push({
            role: "system",
            content: message.content,
          });
        }
        continue;
      }

      // Check if message has files (images)
      const hasFiles = message.files && message.files.length > 0;

      if (hasFiles && message.role === "user") {
        // User message with images - use content array format
        const content: OpenAI.Chat.ChatCompletionContentPart[] = [
          {
            type: "text",
            text: message.content,
          },
        ];

        // Add images
        for (const file of message.files || []) {
          if (this.isImageFile(file.type)) {
            // Prefer URL, fallback to base64 data
            const imageUrl = file.url || (file.data ? `data:${file.type};base64,${file.data}` : null);

            if (imageUrl) {
              content.push({
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
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
   * Check if file type is an image
   */
  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith("image/");
  }

  /**
   * Check if any message has documents
   */
  private hasDocuments(messages: AIMessage[]): boolean {
    return messages.some((msg) => {
      return msg.files?.some((file) => {
        return !this.isImageFile(file.type);
      });
    });
  }

  /**
   * Handle errors and convert to AIError format
   */
  private handleError(error: any, model?: string): AIError {
    const aiError = new Error(
      error.message || "Unknown OpenAI API error"
    ) as AIError;

    aiError.provider = this.name;
    aiError.model = model;

    // Extract error code from OpenAI error
    if (error.status) {
      aiError.code = `HTTP_${error.status}`;
    } else if (error.code) {
      aiError.code = error.code;
    } else {
      aiError.code = "UNKNOWN_ERROR";
    }

    aiError.details = error;

    return aiError;
  }

  /**
   * Static factory method to create provider instance
   */
  static create(): OpenAIProvider {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    return new OpenAIProvider(apiKey);
  }
}
