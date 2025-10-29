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
        max_tokens = 8192,
        system_prompt,
        enable_web_search,
      } = options;

      // Use Responses API if web_search is enabled
      // The Responses API supports hosted tools like web_search
      if (enable_web_search) {
        return await this.generateResponseWithResponsesAPI(messages, options);
      }

      // Format messages for OpenAI API
      const formattedMessages = this.formatMessages(messages, system_prompt);

      // Get enabled tools (excluding web_search since it requires Responses API)
      const tools = getEnabledTools({
        enable_web_search: false, // web_search handled by Responses API
        enable_file_search: options.enable_file_search,
        hasDocuments: this.hasDocuments(messages),
      });

      // Create completion
      // Note: GPT-5 does NOT support temperature, top_p, or logprobs parameters
      const completionParams: any = {
        model,
        messages: formattedMessages,
        max_completion_tokens: max_tokens, // GPT-5 uses max_completion_tokens
        tools: tools.length > 0 ? tools : undefined,
      };

      // Add reasoning effort if provided
      if (options.reasoning_effort) {
        completionParams.reasoning_effort = options.reasoning_effort;
      }

      const completion = await this.client.chat.completions.create(completionParams);

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
   * Generate response using OpenAI Responses API
   * This API supports hosted tools like web_search
   */
  private async generateResponseWithResponsesAPI(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    try {
      const {
        model = "gpt-5",
        max_tokens = 8192,
        system_prompt,
      } = options;

      // Format input for Responses API
      // Responses API expects a single input string, not a messages array
      const input = this.formatInputForResponsesAPI(messages, system_prompt);

      // Build request parameters for Responses API
      // Note: Responses API uses max_output_tokens, NOT max_completion_tokens
      const requestParams: any = {
        model,
        input,
        max_output_tokens: max_tokens,
        tools: [{ type: "web_search" }], // Hosted tools use simple type format
      };

      // Add reasoning effort if provided
      // Note: Responses API uses nested reasoning.effort, not reasoning_effort
      if (options.reasoning_effort) {
        requestParams.reasoning = {
          effort: options.reasoning_effort,
        };
      }

      console.log("[OpenAI] Using Responses API with web_search tool");
      console.log("[OpenAI] Request params:", JSON.stringify(requestParams, null, 2));

      // Call Responses API
      // Note: The OpenAI SDK might not have types for this yet
      const response = await (this.client as any).responses.create(requestParams);

      console.log("[OpenAI] Response received:", {
        hasOutputText: !!response.output_text,
        outputLength: response.output_text?.length,
        usage: response.usage,
      });

      // Extract content from response
      const content = response.output_text || "";

      return {
        content: content.trim(),
        model,
        provider: this.name,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error("[OpenAI] Responses API error:", error);
      console.error("[OpenAI] Error details:", JSON.stringify(error, null, 2));
      throw this.handleError(error, options.model);
    }
  }

  /**
   * Format messages for Responses API
   * Converts messages array to a single input string
   */
  private formatInputForResponsesAPI(
    messages: AIMessage[],
    systemPrompt?: string
  ): string {
    let input = "";

    // Add system prompt if provided
    if (systemPrompt) {
      input += `System: ${systemPrompt}\n\n`;
    }

    // Add conversation history
    for (const message of messages) {
      const role = message.role === "assistant" ? "Assistant" : "User";
      input += `${role}: ${message.content}\n\n`;

      // Add file context if present
      if (message.files && message.files.length > 0) {
        for (const file of message.files) {
          if (file.url) {
            input += `[Attached file: ${file.name || file.url}]\n`;
          }
        }
      }
    }

    return input.trim();
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
        max_tokens = 8192,
        system_prompt,
        enable_web_search,
      } = options;

      // Check if Responses API supports streaming
      // If web_search is enabled, we may need to fallback to non-streaming
      if (enable_web_search) {
        console.log("[OpenAI] Web search enabled - checking if Responses API supports streaming");

        // Try streaming with Responses API
        try {
          yield* this.generateStreamWithResponsesAPI(messages, options);
          return;
        } catch (error: any) {
          // If streaming not supported, fallback to non-streaming
          if (error.message?.includes("streaming") || error.code === "stream_not_supported") {
            console.log("[OpenAI] Responses API doesn't support streaming, falling back to non-streaming");
            const response = await this.generateResponseWithResponsesAPI(messages, options);

            // Yield the full content as a single chunk
            yield {
              content: response.content,
              isComplete: false,
            };

            yield {
              content: "",
              isComplete: true,
              usage: response.usage,
            };
            return;
          }
          throw error;
        }
      }

      // Format messages for OpenAI API
      const formattedMessages = this.formatMessages(messages, system_prompt);

      // Get enabled tools (excluding web_search since it requires Responses API)
      const tools = getEnabledTools({
        enable_web_search: false, // web_search handled by Responses API
        enable_file_search: options.enable_file_search,
        hasDocuments: this.hasDocuments(messages),
      });

      // Create streaming completion
      // Note: GPT-5 does NOT support temperature, top_p, or logprobs parameters
      const streamParams: any = {
        model,
        messages: formattedMessages,
        max_completion_tokens: max_tokens, // GPT-5 uses max_completion_tokens
        tools: tools.length > 0 ? tools : undefined,
        stream: true,
      };

      // Add reasoning effort if provided
      if (options.reasoning_effort) {
        streamParams.reasoning_effort = options.reasoning_effort;
      }

      const stream = (await this.client.chat.completions.create(
        streamParams
      )) as unknown as AsyncIterable<any>;

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
   * Generate streaming response using OpenAI Responses API
   * This API supports hosted tools like web_search
   */
  private async *generateStreamWithResponsesAPI(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): AsyncGenerator<AIStreamChunk> {
    try {
      const {
        model = "gpt-5",
        max_tokens = 8192,
        system_prompt,
      } = options;

      // Format input for Responses API
      const input = this.formatInputForResponsesAPI(messages, system_prompt);

      // Build request parameters for Responses API
      // Note: Responses API uses max_output_tokens, NOT max_completion_tokens
      const requestParams: any = {
        model,
        input,
        max_output_tokens: max_tokens,
        tools: [{ type: "web_search" }],
      };

      // Add reasoning effort if provided
      // Note: Responses API uses nested reasoning.effort, not reasoning_effort
      if (options.reasoning_effort) {
        requestParams.reasoning = {
          effort: options.reasoning_effort,
        };
      }

      console.log("[OpenAI] Streaming with Responses API and web_search tool");
      console.log("[OpenAI] Stream request params:", JSON.stringify(requestParams, null, 2));

      // Call Responses API with streaming
      // IMPORTANT: Must use responses.stream() not responses.create({stream: true})
      const stream = await (this.client as any).responses.stream(requestParams);

      console.log("[OpenAI] Stream started, waiting for events...");

      // Stream chunks - Responses API structure
      let eventCount = 0;
      for await (const chunk of stream) {
        eventCount++;

        // Log first few chunks to understand structure
        if (eventCount <= 5) {
          console.log("[OpenAI] Chunk:", JSON.stringify(chunk, null, 2));
        }

        // Handle different chunk types based on Responses API
        if (chunk.type === "response.output_text.delta" && chunk.delta) {
          console.log(`[OpenAI] Text delta: ${chunk.delta.length} chars`);
          yield {
            content: chunk.delta,
            isComplete: false,
          };
        } else if (chunk.item && typeof chunk.item === "object") {
          // Some chunks have item.text or item.content
          const text = chunk.item.text || chunk.item.content;
          if (text) {
            console.log(`[OpenAI] Text from item: ${text.length} chars`);
            yield {
              content: text,
              isComplete: false,
            };
          }
        } else if (chunk.response && chunk.type === "response.completed") {
          // Stream completed
          console.log("[OpenAI] Stream completed");

          yield {
            content: "",
            isComplete: true,
            usage: {
              prompt_tokens: chunk.response.usage?.prompt_tokens || 0,
              completion_tokens: chunk.response.usage?.completion_tokens || 0,
              total_tokens: chunk.response.usage?.total_tokens || 0,
            },
          };
          break;
        }
      }

      console.log("[OpenAI] Stream finished");
    } catch (error) {
      console.error("[OpenAI] Responses API streaming error:", error);
      console.error("[OpenAI] Stream error details:", JSON.stringify(error, null, 2));
      throw error;
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
