import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getUserFiles } from "@/lib/services/file-upload";

// GET /api/files - Get user's files with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy =
      (searchParams.get("sortBy") as "createdAt" | "size" | "filename") ||
      "createdAt";
    const sortOrder =
      (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
    const analysisStatus = searchParams.get("analysisStatus") as
      | "pending"
      | "processing"
      | "completed"
      | "error"
      | null;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...(analysisStatus && { analysisStatus }),
    };

    const userFiles = await getUserFiles(userId, options);

    // Get total count for pagination
    // Note: In a production app, you'd want to optimize this with a separate count query
    const allFiles = await getUserFiles(userId, { page: 1, limit: 1000 });
    const totalCount = allFiles.length;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        files: userFiles.map((file) => ({
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          url: file.url,
          uploadStatus: file.uploadStatus,
          analysisStatus: file.analysisStatus,
          hasExtractedText: !!file.extractedText,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          metadata: file.metadata,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get files API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get files" },
      { status: 500 }
    );
  }
}
