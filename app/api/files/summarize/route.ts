import { NextRequest, NextResponse } from "next/server";
import { summarizeFileContent } from "@/lib/services/file-summarizer";
import { requireAuthenticatedUser } from "@/lib/auth/session";

/**
 * POST /api/files/summarize
 *
 * Server-side file summarization endpoint
 * Uses Claude Haiku 4.5 to generate summaries of large file content
 *
 * This MUST be server-side because:
 * 1. Requires ANTHROPIC_API_KEY (not allowed in client bundles)
 * 2. Prevents exposing API keys to browsers
 * 3. Requires authentication to prevent API quota abuse
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Verify caller is authenticated
    // Without this, anyone can POST arbitrary text and burn through Claude quota
    await requireAuthenticatedUser();

    const body = await request.json();
    const { content, fileName, mimeType } = body;

    if (!content || !fileName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: content, fileName" },
        { status: 400 }
      );
    }

    // Call server-side summarization
    const result = await summarizeFileContent(content, fileName, mimeType);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[Summarize API] Error:", error);

    // Handle authentication errors explicitly
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          message: "Please sign in to use file summarization",
        },
        { status: 401 }
      );
    }

    // Handle other expected errors
    if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        {
          success: false,
          error: "Service configuration error",
          message: "Summarization service is not properly configured",
        },
        { status: 503 } // Service Unavailable
      );
    }

    // Generic server error for unexpected issues
    return NextResponse.json(
      {
        success: false,
        error: "Failed to summarize file",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
