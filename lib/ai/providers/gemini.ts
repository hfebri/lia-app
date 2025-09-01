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
      console.log(
        "🎯 GEMINI PROVIDER: generateResponse called - using GEMINI API (not Replicate)"
      );
      const {
        model = "gemini-2.5-flash",
        // temperature = 0.7, // Currently unused by Gemini API
        // max_tokens = 1000, // Currently unused by Gemini API
        system_prompt,
      } = options;
      console.log("🎯 GEMINI PROVIDER: Using model:", model);
      console.log(
        "🎯 GEMINI PROVIDER: API Key configured:",
        !!process.env.GEMINI_API_KEY
      );
      console.log("🎯 GEMINI PROVIDER: Messages count:", messages.length);

      // Format messages for Gemini API
      const contents = this.formatMessagesForAPI(messages, system_prompt);

      const config = {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      };

      console.log("🎯 GEMINI PROVIDER: About to call generateContent...");
      console.log("🎯 GEMINI PROVIDER: Request config:", { model, config });
      console.log("🎯 GEMINI PROVIDER: Contents length:", contents.length);

      // Generate content with config
      const response = await this.client.models.generateContent({
        model,
        config,
        contents,
      });

      console.log("🎯 GEMINI PROVIDER: Response received successfully");
      console.log("🎯 GEMINI PROVIDER: Response type:", typeof response);

      // Extract content from response
      const content = response.text || "";
      console.log(
        "🎯 GEMINI PROVIDER: Extracted content length:",
        content.length
      );

      return {
        content,
        model,
        provider: this.name,
        usage: this.extractUsage(response),
      };
    } catch (error) {
      console.error("🎯 GEMINI PROVIDER: Error occurred!", error);
      console.error("🎯 GEMINI PROVIDER: Error type:", typeof error);
      console.error(
        "🎯 GEMINI PROVIDER: Error message:",
        error instanceof Error ? error.message : String(error)
      );
      console.error(
        "🎯 GEMINI PROVIDER: Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
      throw this.handleError(error, options.model);
    }
  }

  async *generateStream(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): AsyncGenerator<AIStreamChunk> {
    try {
      console.log(
        "🎯 GEMINI PROVIDER: generateStream called - using GEMINI API (not Replicate)"
      );
      const {
        model = "gemini-2.5-flash",
        // temperature = 0.7, // Currently unused by Gemini API
        // max_tokens = 1000, // Currently unused by Gemini API
        system_prompt,
      } = options;

      console.log(
        "🎯 GEMINI PROVIDER: Streaming request with model:",
        model,
        "| Messages:",
        messages.length
      );

      // Format messages for Gemini API
      const contents = this.formatMessagesForAPI(messages, system_prompt);

      // Create generation config (currently unused but kept for future use)
      // const generationConfig = {
      //   temperature,
      //   maxOutputTokens: max_tokens,
      // };

      const config = {
        thinkingConfig: {
          thinkingBudget: 0,
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
            usage: this.extractUsage(chunk),
          };
        }
      }

      yield {
        content: "",
        isComplete: true,
      };
    } catch (error) {
      console.error("Gemini generateStream error:", error);
      throw this.handleError(error, options.model);
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
    console.log("🔥 GEMINI DEBUG: formatMessagesForAPI called");
    console.log("🔥 GEMINI DEBUG: Input messages count:", messages.length);
    console.log("🔥 GEMINI DEBUG: System prompt:", systemPrompt);

    const contents: Array<{
      role: string;
      parts: Array<{
        text?: string;
        inlineData?: { data: string; mimeType: string };
      }>;
    }> = [];

    // Add system prompt if provided
    if (systemPrompt) {
      console.log("🔥 GEMINI DEBUG: Adding system prompt to contents");
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
    console.log("🔥 GEMINI DEBUG: Starting message conversion loop");
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(
        `🔥 GEMINI DEBUG: Processing message ${i + 1}/${messages.length}:`,
        {
          role: message.role,
          content:
            message.content?.substring(0, 100) +
            (message.content?.length > 100 ? "..." : ""),
          hasFiles: !!message.files && message.files.length > 0,
          fileCount: message.files?.length || 0,
        }
      );

      let role: string = message.role;

      // Map roles to Gemini format
      if (role === "assistant") {
        console.log("🔥 GEMINI DEBUG: Mapping 'assistant' role to 'model'");
        role = "model";
      } else if (role === "system") {
        console.log("🔥 GEMINI DEBUG: Skipping system message (handled above)");
        continue;
      }
      console.log("🔥 GEMINI DEBUG: Final role for this message:", role);

      const parts: Array<{
        text?: string;
        inlineData?: { data: string; mimeType: string };
      }> = [];
      console.log("🔥 GEMINI DEBUG: Building parts for message");

      // Add text content if present
      if (message.content) {
        console.log("🔥 GEMINI DEBUG: Adding text content to parts");
        parts.push({ text: message.content });
      } else {
        console.log("🔥 GEMINI DEBUG: No text content for this message");
      }

      // Add files if present (multimodal support)
      if (message.files && message.files.length > 0) {
        console.log(
          `🔥 GEMINI DEBUG: Processing ${message.files.length} files`
        );
        for (let j = 0; j < message.files.length; j++) {
          const file = message.files[j];
          console.log(`🔥 GEMINI DEBUG: Processing file ${j + 1}:`, {
            name: file.name,
            type: file.type,
            size: file.size,
            isImage: file.type.startsWith("image/"),
            dataLength: file.data?.length || 0,
          });

          // For files (images, PDFs, etc.), use inlineData format as per Gemini API
          console.log(
            `🔥 GEMINI DEBUG: Adding file as inlineData - ${file.type}`
          );
          parts.push({
            inlineData: {
              data: file.data, // base64 data
              mimeType: file.type,
            },
          });
        }
      } else {
        console.log("🔥 GEMINI DEBUG: No files for this message");
      }

      console.log(
        `🔥 GEMINI DEBUG: Final parts count for this message: ${parts.length}`
      );
      console.log(
        "🔥 GEMINI DEBUG: Parts content:",
        JSON.stringify(parts, null, 2)
      );

      // Only add the message if it has content
      if (parts.length > 0) {
        console.log("🔥 GEMINI DEBUG: Adding message to contents");
        contents.push({
          role,
          parts,
        });
      } else {
        console.log("🔥 GEMINI DEBUG: Skipping message - no parts");
      }
    }

    console.log("🔥 GEMINI DEBUG: Message conversion complete");
    console.log(`🔥 GEMINI DEBUG: Final contents count: ${contents.length}`);
    console.log(
      "🔥 GEMINI DEBUG: Final contents:",
      JSON.stringify(contents, null, 2)
    );

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
      console.warn("Failed to extract usage from Gemini response:", error);
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
