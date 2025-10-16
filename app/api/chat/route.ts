import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai/service";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import type { AIMessage, AIProviderName } from "@/lib/ai/types";
import { LIA_SYSTEM_INSTRUCTION } from "@/lib/constants/ai-models";

export async function POST(request: NextRequest) {
  try {
    // Require authentication for all chat requests and get user info
    const authenticatedUser = await requireAuthenticatedUser(request);
    let messages,
      model = "openai/gpt-5",
      stream = false,
      extended_thinking = false,
      thinking_budget_tokens = 1024,
      max_image_resolution = 0.5,
      reasoning_effort: "minimal" | "low" | "medium" | "high" = "medium",
      enable_web_search = true,
      verbosity: "low" | "medium" | "high" = "medium",
      systemInstruction = "",
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
      enable_web_search = formData.get("enable_web_search") !== "false";
      verbosity = (formData.get("verbosity") as "low" | "medium" | "high") || "medium";
      systemInstruction = (formData.get("systemInstruction") as string) || "";

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
        reasoning_effort,
        enable_web_search,
        verbosity,
        systemInstruction,
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

    // Determine provider based on model
    let provider: AIProviderName = "replicate";
    if (model.startsWith("gemini")) {
      provider = "gemini";
    } else if (model.startsWith("anthropic/") || model.startsWith("openai/") || model.startsWith("deepseek-ai/")) {
      // Anthropic, OpenAI, and DeepSeek models are served through Replicate
      provider = "replicate";
    }

    // Convert messages to AI format - preserve files in messages
    const aiMessages: AIMessage[] = messages.map(
      (msg: {
        role: string;
        content: string;
        files?: Array<{
          name: string;
          type: string;
          size?: number;
          data?: string;
          url?: string;
        }>;
        [key: string]: unknown;
      }) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        files: msg.files, // Preserve files from message
      })
    );

    if (stream) {
      // Create streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Combine default LIA system instruction with user's custom instruction
            let combinedSystemPrompt = LIA_SYSTEM_INSTRUCTION;

            // Add user's professional role to system instruction if available
            if (authenticatedUser.user.professionalRole) {
              combinedSystemPrompt += `\n\nUSER CONTEXT:\n- Professional Role: ${authenticatedUser.user.professionalRole}\n- Tailor your responses to be relevant for someone in this role`;
            }

            if (systemInstruction && systemInstruction.trim()) {
              combinedSystemPrompt = `${combinedSystemPrompt}\n\nAdditional Instructions: ${systemInstruction.trim()}`;
            }

            const stream = aiService.generateStream(aiMessages, {
              model,
              provider,
              temperature: 0.7,
              max_tokens: 8192,
              system_prompt: combinedSystemPrompt,
              extended_thinking,
              thinking_budget_tokens,
              max_image_resolution,
              reasoning_effort,
              enable_web_search,
              verbosity,
            });

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
      // Combine default LIA system instruction with user's custom instruction
      let combinedSystemPrompt = LIA_SYSTEM_INSTRUCTION;

      // Add user's professional role to system instruction if available
      if (authenticatedUser.user.professionalRole) {
        combinedSystemPrompt += `\n\nUSER CONTEXT:\n- Professional Role: ${authenticatedUser.user.professionalRole}\n- Tailor your responses to be relevant for someone in this role`;
      }

      if (systemInstruction && systemInstruction.trim()) {
        combinedSystemPrompt = `${combinedSystemPrompt}\n\nAdditional Instructions: ${systemInstruction.trim()}`;
      }

      const response = await aiService.generateResponse(aiMessages, {
        model,
        provider,
        temperature: 0.7,
        max_tokens: 8192,
        system_prompt: combinedSystemPrompt,
        extended_thinking,
        thinking_budget_tokens,
        max_image_resolution,
        reasoning_effort,
        enable_web_search,
        verbosity,
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
    console.error("[API /api/chat] Failed to process request:", error);
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
