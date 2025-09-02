import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  analyzeDocument,
  analyzeDocuments,
  getFileAnalysis,
} from "@/lib/services/document-analysis";
import { getFileById } from "@/lib/services/file-upload";

// POST /api/files/analyze - Analyze one or more files
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const body = await request.json();
    const { fileIds, fileId, options = {} } = body;

    // Validate input
    if (!fileId && (!fileIds || !Array.isArray(fileIds))) {
      return NextResponse.json(
        { success: false, error: "fileId or fileIds array is required" },
        { status: 400 }
      );
    }

    const targetFileIds = fileId ? [fileId] : fileIds;

    // Verify user owns all files
    for (const id of targetFileIds) {
      const file = await getFileById(id, userId);
      if (!file) {
        return NextResponse.json(
          { success: false, error: `File not found: ${id}` },
          { status: 404 }
        );
      }
    }

    if (targetFileIds.length === 1) {
      // Single file analysis
      const result = await analyzeDocument(targetFileIds[0], options);

      return NextResponse.json({
        success: result.success,
        data: result.success ? result.analysis : null,
        error: result.error,
      });
    } else {
      // Multiple file analysis
      const results = await analyzeDocuments(targetFileIds, options);

      const successful = results.filter((r) => r.result.success);
      const failed = results.filter((r) => !r.result.success);

      return NextResponse.json({
        success: true,
        data: {
          results: results.map((r) => ({
            fileId: r.fileId,
            success: r.result.success,
            analysis: r.result.analysis,
            error: r.result.error,
          })),
          summary: {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
          },
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}

// GET /api/files/analyze?fileId=xxx - Get analysis results
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "fileId parameter is required" },
        { status: 400 }
      );
    }

    // Verify user owns the file
    const file = await getFileById(fileId, userId);
    if (!file) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    const analysis = await getFileAnalysis(fileId);

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        fileId: analysis.id,
        filename: analysis.filename,
        analysisStatus: analysis.analysisStatus,
        analysis: analysis.analysis,
        hasExtractedText: !!analysis.extractedText,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to get analysis" },
      { status: 500 }
    );
  }
}
