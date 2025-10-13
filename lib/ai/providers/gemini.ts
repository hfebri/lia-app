import { GoogleGenAI } from "@google/genai";
import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIGenerationOptions,
  AIError,
} from "../types";

export class GeminiProvider implements AIProvider {
  public readonly name = "gemini";
  public readonly models = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ];
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({
      apiKey,
    });
  }

  async generateResponse(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    try {
      const {
        model = "gemini-2.5-flash",
        // temperature = 0.7, // Currently unused by Gemini API
        // max_tokens = 1000, // Currently unused by Gemini API
        system_prompt,
        thinking_mode,
      } = options;

      // Format messages for Gemini API
      const contents = this.formatMessagesForAPI(messages, system_prompt);

      // Determine thinking config - always on for 2.5 Pro
      const shouldUseThinking = model === "gemini-2.5-pro" || thinking_mode;
      
      const config = {
        thinkingConfig: {
          thinkingBudget: shouldUseThinking ? -1 : 0,
        },
      };

      // Generate content with config
      const response = await this.client.models.generateContent({
        model,
        config,
        contents,
      });

      // Extract content from response
      const content = response.text || "";

      return {
        content,
        model,
        provider: this.name,
        usage: this.extractUsage(response as any),
      };
    } catch (error) {
      throw this.handleError(error as Error, options.model);
    }
  }

  async *generateStream(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): AsyncGenerator<AIStreamChunk> {
    try {
      const {
        model = "gemini-2.5-flash",
        // temperature = 0.7, // Currently unused by Gemini API
        // max_tokens = 1000, // Currently unused by Gemini API
        system_prompt,
        thinking_mode,
      } = options;

      // Format messages for Gemini API
      const contents = this.formatMessagesForAPI(messages, system_prompt);

      // Create generation config (currently unused but kept for future use)
      // const generationConfig = {
      //   temperature,
      //   maxOutputTokens: max_tokens,
      // };

      // Determine thinking config - always on for 2.5 Pro
      const shouldUseThinking = model === "gemini-2.5-pro" || thinking_mode;

      const config = {
        thinkingConfig: {
          thinkingBudget: shouldUseThinking ? -1 : 0,
        },
      };

      const stream = await this.client.models.generateContentStream({
        model,
        config,
        contents,
      });

      for await (const chunk of stream) {
        const text = chunk.text || "";
        if (text) {
          yield {
            content: text,
            isComplete: false,
            usage: this.extractUsage(chunk as any),
          };
        }
      }

      yield {
        content: "",
        isComplete: true,
      };
    } catch (error) {
      throw this.handleError(error as Error, options.model);
    }
  }

  private formatMessagesForAPI(
    messages: AIMessage[],
    systemPrompt?: string
  ): Array<{
    role: string;
    parts: Array<{
      text?: string;
      inlineData?: { data: string; mimeType: string };
    }>;
  }> {
    const contents: Array<{
      role: string;
      parts: Array<{
        text?: string;
        inlineData?: { data: string; mimeType: string };
      }>;
    }> = [];

    // Add system prompt if provided
    if (systemPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: systemPrompt }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "I understand. I'll follow these instructions." }],
      });
    }

    // Convert messages to Gemini format
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      let role: string = message.role;

      // Map roles to Gemini format
      if (role === "assistant") {
        role = "model";
      } else if (role === "system") {
        continue;
      }

      const parts: Array<{
        text?: string;
        inlineData?: { data: string; mimeType: string };
      }> = [];

      // Add text content if present
      if (message.content) {
        parts.push({ text: message.content });
      }

      // Add files if present (multimodal support)
      if (message.files && message.files.length > 0) {
        for (let j = 0; j < message.files.length; j++) {
          const file = message.files[j];

          if (file.data) {
            parts.push({
              inlineData: {
                data: file.data,
                mimeType: file.type,
              },
            });
          }
        }
      }

      // Only add the message if it has content
      if (parts.length > 0) {
        contents.push({
          role,
          parts,
        });
      }
    }

    return contents;
  }

  private extractUsage(response: {
    usage?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  }):
    | { prompt_tokens: number; completion_tokens: number; total_tokens: number }
    | undefined {
    try {
      // The Google GenAI SDK might have usage information in the response
      // This is a placeholder as the exact structure depends on the SDK version
      if (response.usage) {
        return {
          prompt_tokens: response.usage.promptTokenCount || 0,
          completion_tokens: response.usage.candidatesTokenCount || 0,
          total_tokens: response.usage.totalTokenCount || 0,
        };
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private handleError(
    error: Error & { message?: string },
    model?: string
  ): AIError {
    const aiError = new Error(
      error.message || "Unknown Gemini API error"
    ) as AIError;
    aiError.provider = this.name;
    aiError.model = model;
    aiError.code = "GEMINI_ERROR";
    aiError.details = error;
    return aiError;
  }

  static create(): GeminiProvider {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    return new GeminiProvider(apiKey);
  }
}
