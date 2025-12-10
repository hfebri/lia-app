import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai/service";
import { requireAuthenticatedUser } from "@/lib/auth/session";

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute should be enough for prompt enhancement

/**
 * POST /api/ai/enhance-prompt
 *
 * Enhances a user's system instruction prompt using Claude 4.5 Sonnet
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { userId, user } = await requireAuthenticatedUser();

    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Initialize AI service
    const aiService = new AIService();

    // System instruction for the enhancement task
    const enhancementSystemPrompt = `You are an expert prompt engineer. Your task is to enhance and improve system instructions for AI assistants.

When given a user's system instruction, you should:
1. Maintain the core intent and requirements
2. Make it more clear, specific, and actionable
3. Add helpful context and structure
4. Improve grammar and clarity
5. Keep it concise but comprehensive

Return ONLY the enhanced system instruction, without any preamble, explanation, or meta-commentary.`;

    // Call Claude 4.5 Sonnet to enhance the prompt
    const response = await aiService.generateResponse(
      [
        {
          role: "user",
          content: `Please enhance this system instruction:\n\n${prompt}`,
        },
      ],
      {
        model: "claude-sonnet-4-5-20250929",
        provider: "anthropic",
        max_tokens: 4096,
        temperature: 0.7,
        system_prompt: enhancementSystemPrompt,
      }
    );

    return NextResponse.json({
      success: true,
      enhancedPrompt: response.content,
      usage: response.usage,
    });
  } catch (error) {
    console.error("[enhance-prompt] Error:", error);

    // Handle authentication errors specifically
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Unauthorized - please sign in" },
        { status: 401 }
      );
    }

    // All other errors are server errors
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to enhance prompt"
      },
      { status: 500 }
    );
  }
}
