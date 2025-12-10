import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { MarkerOCRService } from "@/lib/services/marker-ocr";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/files/ocr
 *
 * Process a file using Marker OCR to extract text content.
 * The file must be uploaded to Supabase storage first and a public URL provided.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    await requireAuthenticatedUser();

    const body = await request.json();
    const { fileUrl, fileName, mimeType, mode } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: "File URL is required" },
        { status: 400 }
      );
    }

    if (!mimeType) {
      return NextResponse.json(
        { success: false, error: "MIME type is required" },
        { status: 400 }
      );
    }

    // Check if file type is supported
    if (!MarkerOCRService.isSupportedFileType(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${mimeType}. Supported types: PDF, DOC, DOCX, PPT, PPTX, PNG, JPG, JPEG, WEBP`,
        },
        { status: 400 }
      );
    }

    // Initialize Marker OCR service
    const markerService = MarkerOCRService.create();

    // Process the file
    const result = await markerService.processFile(fileUrl, {
      mode: mode || "fast",
      include_metadata: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        mimeType,
        extractedText: result.markdown,
        metadata: result.metadata,
        images: result.images,
      },
    });
  } catch (error) {
    console.error("[API /api/files/ocr] OCR processing failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process file with OCR",
      },
      { status: 500 }
    );
  }
}
