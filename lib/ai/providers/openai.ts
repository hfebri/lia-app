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
  private static readonly RESPONSES_ONLY_MODELS = new Set(["gpt-5-pro"]);

  // Model-specific API MAXIMUM token limits (what the API allows)
  // Used for clamping to prevent 400 errors
  private static readonly MODEL_API_LIMITS = {
    "gpt-5-pro": 128000,    // API supports 128k
    "gpt-5": 8192,          // API documented limit: 8192
    "gpt-5-mini": 8192,     // API documented limit: 8192
    "gpt-5-nano": 8192,     // API documented limit: 8192
  } as const;

  // Practical defaults (what we actually request by default)
  private static readonly DEFAULT_MAX_TOKENS = 8192;

  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      // CRITICAL: GPT-5 Pro can take 5+ minutes to respond with Responses API
      // Default timeout is 10 minutes, but we set it explicitly
      timeout: 10 * 60 * 1000, // 10 minutes in milliseconds
      maxRetries: 2, // Retry on network errors
    });
  }

  /**
   * Get maximum tokens for a specific model
   * If requestedTokens is provided, clamps it to the model's API limit
   * Otherwise, returns a practical default
   */
  private getMaxTokensForModel(model: string, requestedTokens?: number): number {
    const apiLimit = OpenAIProvider.MODEL_API_LIMITS[model as keyof typeof OpenAIProvider.MODEL_API_LIMITS] || 8192;

    if (requestedTokens !== undefined) {
      // Clamp requested tokens to API limit to prevent 400 errors
      return Math.min(requestedTokens, apiLimit);
    }

    // No specific request: use safe default
    return OpenAIProvider.DEFAULT_MAX_TOKENS;
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
        max_tokens,
        system_prompt,
        enable_web_search,
      } = options;

      // Clamp max_tokens to model's API limit
      const clampedMaxTokens = this.getMaxTokensForModel(model, max_tokens);

      const requiresResponsesAPI = this.shouldUseResponsesAPI(model, options);

      // Use Responses API if web_search is enabled
      // The Responses API supports hosted tools like web_search
      if (enable_web_search || requiresResponsesAPI) {
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
        max_completion_tokens: clampedMaxTokens, // GPT-5 uses max_completion_tokens, clamped to API limit
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
        max_tokens,
        system_prompt,
      } = options;

      // Clamp max_tokens to model's API limit
      const clampedMaxTokens = this.getMaxTokensForModel(model, max_tokens);

      // Format input for Responses API
      // Responses API expects a single input string, not a messages array
      const input = this.formatInputForResponsesAPI(messages, system_prompt);

      // Build request parameters for Responses API
      // Note: Responses API uses max_output_tokens, NOT max_completion_tokens
      const requestParams: any = {
        model,
        input,
        max_output_tokens: clampedMaxTokens, // Clamped to API limit
      };

      const tools = this.getResponsesApiTools(options, messages);
      if (tools) {
        requestParams.tools = tools;
      }

      // Add reasoning effort if provided
      // Note: Responses API uses nested reasoning.effort, not reasoning_effort
      if (options.reasoning_effort) {
        requestParams.reasoning = {
          effort: options.reasoning_effort,
        };
      }

      // Call Responses API
      // Note: The OpenAI SDK might not have types for this yet
      const response = await (this.client as any).responses.create(requestParams);

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
  ): Array<{
    role: "system" | "user" | "assistant";
    content: Array<
      | { type: "input_text"; text: string }
      | { type: "output_text"; text: string }
      | { type: "input_image"; image_url: string }
    >;
  }> {
    const formattedInput: Array<{
      role: "system" | "user" | "assistant";
      content: Array<
        | { type: "input_text"; text: string }
        | { type: "output_text"; text: string }
        | { type: "input_image"; image_url: string }
      >;
    }> = [];

    if (systemPrompt) {
      formattedInput.push({
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      });
    }

    for (const message of messages) {
      // Skip duplicate system messages if a system prompt was provided separately
      if (message.role === "system" && systemPrompt) {
        continue;
      }

      const contentParts: Array<
        | { type: "input_text"; text: string }
        | { type: "output_text"; text: string }
        | { type: "input_image"; image_url: string }
      > = [];

      // CRITICAL: Assistant messages use output_text (previous AI responses)
      // User/system messages use input_text (user inputs)
      if (message.content && message.content.trim().length > 0) {
        contentParts.push({
          type: message.role === "assistant" ? "output_text" : "input_text",
          text: message.content,
        } as any);
      }

      // Only user messages can have file attachments
      if (message.role === "user" && message.files && message.files.length > 0) {
        for (const file of message.files) {
          const isImage = this.isImageFile(file.type);
          if (isImage) {
            const imageUrl =
              (file as any).url ||
              (file.data
                ? `data:${file.type};base64,${file.data}`
                : null);

            if (imageUrl) {
              contentParts.push({
                type: "input_image",
                image_url: imageUrl,
              });
            } else {
              contentParts.push({
                type: "input_text",
                text: `[Attached image: ${file.name || "image"}]`,
              });
            }
          } else {
            contentParts.push({
              type: "input_text",
              text: `[Attached file: ${file.name || "file"} (${file.type})]`,
            });
          }
        }
      }

      if (contentParts.length === 0) {
        continue;
      }

      const role: "system" | "user" | "assistant" =
        message.role === "assistant"
          ? "assistant"
          : message.role === "system"
          ? "system"
          : "user";

      formattedInput.push({
        role,
        content: contentParts,
      });
    }

    if (formattedInput.length === 0) {
      formattedInput.push({
        role: "user",
        content: [{ type: "input_text", text: "" }],
      });
    }

    return formattedInput;
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
        max_tokens,
        system_prompt,
        enable_web_search,
      } = options;

      // Clamp max_tokens to model's API limit
      const clampedMaxTokens = this.getMaxTokensForModel(model, max_tokens);

      const requiresResponsesAPI = this.shouldUseResponsesAPI(model, options);

      // Check if Responses API supports streaming
      // If web_search is enabled or model requires responses API, use responses API
      if (enable_web_search || requiresResponsesAPI) {
        // Try streaming with Responses API
        try {
          yield* this.generateStreamWithResponsesAPI(messages, options);
          return;
        } catch (error: any) {
          // If streaming not supported, fallback to non-streaming
          if (error.message?.includes("streaming") || error.code === "stream_not_supported") {
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
        max_completion_tokens: clampedMaxTokens, // GPT-5 uses max_completion_tokens, clamped to API limit
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
            isTruncated: finishReason === "length", // Flag if response was cut off
            stopReason: finishReason,                // Include finish reason ("length", "stop", "content_filter")
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
        max_tokens,
        system_prompt,
      } = options;

      // Clamp max_tokens to model's API limit
      const clampedMaxTokens = this.getMaxTokensForModel(model, max_tokens);

      // Format input for Responses API
      const input = this.formatInputForResponsesAPI(messages, system_prompt);

      // Build request parameters for Responses API
      // Note: Responses API uses max_output_tokens, NOT max_completion_tokens
      const requestParams: any = {
        model,
        input,
        max_output_tokens: clampedMaxTokens, // Clamped to API limit
      };

      const tools = this.getResponsesApiTools(options, messages);
      if (tools) {
        requestParams.tools = tools;
      }

      // Add reasoning effort if provided
      // Note: Responses API uses nested reasoning.effort, not reasoning_effort
      if (options.reasoning_effort) {
        requestParams.reasoning = {
          effort: options.reasoning_effort,
        };
      }

      // Call Responses API with streaming
      // IMPORTANT: Must use responses.stream() not responses.create({stream: true})
      const stream = await (this.client as any).responses.stream(requestParams);

      // Stream chunks - Responses API structure
      for await (const chunk of stream) {
        // Handle different chunk types based on Responses API
        if (chunk.type === "response.output_text.delta" && chunk.delta) {
          yield {
            content: chunk.delta,
            isComplete: false,
          };
        } else if (chunk.item && typeof chunk.item === "object") {
          // Some chunks have item.text or item.content
          const text = chunk.item.text || chunk.item.content;
          if (text) {
            yield {
              content: text,
              isComplete: false,
            };
          }
        } else if (chunk.response && chunk.type === "response.completed") {
          // Stream completed - check for stop reason
          const finishReason = chunk.response.finish_reason || chunk.response.output?.finish_reason;
          yield {
            content: "",
            isComplete: true,
            isTruncated: finishReason === "length", // Flag if response was cut off
            stopReason: finishReason,                // Include finish reason
            usage: {
              prompt_tokens: chunk.response.usage?.prompt_tokens || 0,
              completion_tokens: chunk.response.usage?.completion_tokens || 0,
              total_tokens: chunk.response.usage?.total_tokens || 0,
            },
          };
          break;
        }
      }
    } catch (error: any) {
      console.error("[OpenAI] Responses API streaming error:", error);
      console.error("[OpenAI] Stream error details:", JSON.stringify(error, null, 2));

      // Check if this is a timeout/socket error (common with GPT-5 Pro)
      const isSocketError = error?.cause?.cause?.code === 'UND_ERR_SOCKET' ||
                           error?.message === 'terminated' ||
                           error?.code === 'ECONNRESET';

      if (isSocketError && options.model === 'gpt-5-pro') {
        // GPT-5 Pro timeout - provide helpful error message
        const timeoutError = new Error(
          'GPT-5 Pro response timed out. This model can take 5+ minutes but platform limits are: ' +
          'Netlify Free/Pro (26s), Vercel Hobby (10s), Vercel Pro (60s). ' +
          'Solutions: (1) Use gpt-5 instead for faster responses, (2) Upgrade to Enterprise tier, or ' +
          '(3) Reduce reasoning complexity by lowering max_output_tokens.'
        ) as AIError;
        timeoutError.provider = this.name;
        timeoutError.model = options.model;
        timeoutError.code = 'PLATFORM_TIMEOUT';
        timeoutError.details = error;
        throw timeoutError;
      }

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

      // Check if message has files
      const hasFiles = message.files && message.files.length > 0;

      if (hasFiles && message.role === "user") {
        // User message with files - use content array format for native vision
        const content: OpenAI.Chat.ChatCompletionContentPart[] = [
          {
            type: "text",
            text: message.content,
          },
        ];

        // Add all images with native vision support
        // Multiple images are supported in a single message
        for (const file of message.files || []) {
          if (this.isImageFile(file.type)) {
            // Prefer URL, fallback to base64 data
            const imageUrl = file.url || (file.data ? `data:${file.type};base64,${file.data}` : null);

            if (imageUrl) {
              content.push({
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  // Optional: Add detail level for token optimization
                  // detail: "auto" | "low" | "high"
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
   * Determine if the Responses API should be used for the given model/options
   */
  private shouldUseResponsesAPI(
    model?: string,
    _options: AIGenerationOptions = {}
  ): boolean {
    if (!model) {
      return false;
    }
    return OpenAIProvider.RESPONSES_ONLY_MODELS.has(model);
  }

  /**
   * Map enabled tools into the format expected by the Responses API
   */
  private getResponsesApiTools(
    options: AIGenerationOptions = {},
    messages?: AIMessage[]
  ): any[] | undefined {
    const enabledTools = getEnabledTools({
      enable_web_search: options.enable_web_search,
      enable_file_search: options.enable_file_search,
      hasDocuments: messages ? this.hasDocuments(messages) : false,
    });

    if (enabledTools.length === 0) {
      return undefined;
    }

    const responsesTools = enabledTools
      .map((tool) => {
        if (tool.type === "custom" && tool.custom?.name) {
          return { type: tool.custom.name };
        }
        if (tool.type === "function" && tool.function?.name) {
          return {
            type: "function",
            function: {
              name: tool.function.name,
              description: tool.function.description,
              parameters: tool.function.parameters,
            },
          };
        }
        return null;
      })
      .filter(
        (tool): tool is NonNullable<typeof tool> => tool !== null
      );

    return responsesTools.length > 0 ? responsesTools : undefined;
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
