import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai/service";
import type { AIMessage } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model = "openai/gpt-5", stream = false } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Initialize AI service
    const aiService = new AIService();

    // Convert messages to AI format
    const aiMessages: AIMessage[] = messages.map((msg: any) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    if (stream) {
      // Create streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const stream = aiService.generateStream(aiMessages, {
              model,
              temperature: 0.7,
              max_tokens: 1000,
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
            console.error("Streaming error:", error);
            const errorData = JSON.stringify({
              error:
                error instanceof Error ? error.message : "Streaming failed",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
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
        temperature: 0.7,
        max_tokens: 1000,
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
    console.error("Chat API error:", error);
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
