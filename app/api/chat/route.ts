import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai/service";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import type { AIMessage, AIProviderName } from "@/lib/ai/types";
import {
  fileAnalysisService,
  FileAnalysisService,
} from "@/lib/services/file-analysis-service";

export async function POST(request: NextRequest) {
  try {
    // Require authentication for all chat requests
    await requireAuthenticatedUser();
    let messages,
      model = "openai/gpt-5",
      stream = false,
      extended_thinking = false,
      thinking_budget_tokens = 1024,
      max_image_resolution = 0.5,
      files: Array<{
        name: string;
        type: string;
        size: number;
        data: string;
      }> = [];

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData for file uploads
      const formData = await request.formData();

      messages = JSON.parse((formData.get("messages") as string) || "[]");
      model = (formData.get("model") as string) || "openai/gpt-5";
      stream = formData.get("stream") === "true";
      extended_thinking = formData.get("extended_thinking") === "true";
      thinking_budget_tokens =
        parseInt(formData.get("thinking_budget_tokens") as string) || 1024;
      max_image_resolution =
        parseFloat(formData.get("max_image_resolution") as string) || 0.5;

      // Extract files
      const fileEntries = Array.from(formData.entries()).filter(([key]) =>
        key.startsWith("file_")
      );
      files = await Promise.all(
        fileEntries.map(async ([, file]) => {
          const f = file as File;
          const buffer = await f.arrayBuffer();
          return {
            name: f.name,
            type: f.type,
            size: f.size,
            data: Buffer.from(buffer).toString("base64"),
          };
        })
      );
    } else {
      // Handle JSON for text-only messages or messages with base64 files
      const body = await request.json();
      ({
        messages,
        model,
        stream,
        extended_thinking,
        thinking_budget_tokens,
        max_image_resolution,
      } = body);

      // Extract files from the LATEST USER MESSAGE ONLY (not from entire conversation history)
      if (messages && Array.isArray(messages)) {
        messages.forEach(
          (msg: { files?: unknown[]; [key: string]: unknown }) => {
            if (msg.files && Array.isArray(msg.files)) {
              files.push(
                ...(msg.files as Array<{
                  name: string;
                  type: string;
                  size: number;
                  data: string;
                }>)
              );
            }
          }
        );
      }
    }

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Initialize AI service
    const aiService = new AIService();

    // Determine provider based on model - NO FALLBACK LOGIC
    let provider: AIProviderName = "replicate";
    if (model.startsWith("gemini")) {
      provider = "gemini";
    }

    // Handle file analysis - process files for all non-Gemini models using Replicate
    let fileAnalysisResults: any[] = [];
    if (
      files.length > 0 &&
      !FileAnalysisService.supportsNativeFileHandling(provider)
    ) {
      try {
        fileAnalysisResults = await fileAnalysisService.analyzeFiles(
          files,
          provider,
          model
        );
      } catch (error) {
        // Continue without file analysis instead of breaking the chat
        fileAnalysisResults = [];
      }
    }

    // Convert messages to AI format
    const aiMessages: AIMessage[] = messages.map(
      (
        msg: {
          role: string;
          content: string;
          files?: unknown[];
          [key: string]: unknown;
        },
        index: number
      ) => {
        // If this is the last user message and we have files, handle them based on provider
        const isLastUserMessage =
          index === messages.length - 1 && msg.role === "user";

        if (isLastUserMessage && files.length > 0) {
          if (FileAnalysisService.supportsNativeFileHandling(provider)) {
            // For Gemini, pass files directly
            return {
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
              files: files,
            };
          } else {
            // For all other providers (Replicate), enhance the content with file analysis
            const enhancedContent = fileAnalysisService.createEnhancedPrompt(
              msg.content,
              fileAnalysisResults
            );
            return {
              role: msg.role as "user" | "assistant" | "system",
              content: enhancedContent,
            };
          }
        }

        return {
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        };
      }
    );

    if (stream) {
      // Create streaming response
      console.log("🌊 Starting streaming response...");
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            console.log("🚀 Generating AI stream...");
            const stream = aiService.generateStream(aiMessages, {
              model,
              provider,
              temperature: 0.7,
              max_tokens: 8192,
              extended_thinking,
              thinking_budget_tokens,
              max_image_resolution,
            });
            console.log("✅ AI stream created successfully");

            for await (const chunk of stream) {
              const data = JSON.stringify({
                content: chunk.content,
                isComplete: chunk.isComplete,
                usage: chunk.usage,
              });

              controller.enqueue(encoder.encode(`data: ${data}\n\n`));

              if (chunk.isComplete) {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                break;
              }
            }
          } catch (error) {
            // Send error as a complete message with typing animation
            const errorMessage =
              error instanceof Error ? error.message : "Streaming failed";
            const errorData = JSON.stringify({
              content: `Error: ${errorMessage}`,
              isComplete: true,
              error: true,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    } else {
      // Generate non-streaming response
      const response = await aiService.generateResponse(aiMessages, {
        model,
        provider,
        temperature: 0.7,
        max_tokens: 8192,
        extended_thinking,
        thinking_budget_tokens,
        max_image_resolution,
      });

      return NextResponse.json({
        success: true,
        data: {
          content: response.content,
          model: response.model,
          provider: response.provider,
          usage: response.usage,
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process chat",
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
