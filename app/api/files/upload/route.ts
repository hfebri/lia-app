import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { uploadFile, uploadFiles } from "@/lib/services/file-upload";

export async function POST(request: NextRequest) {
  try {
    // Check Supabase configuration first
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "File upload service not configured. Missing Supabase environment variables.",
          details: {
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
              ? "✓ Present"
              : "✗ Missing NEXT_PUBLIC_SUPABASE_URL",
            serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
              ? "✓ Present"
              : "✗ Missing SUPABASE_SERVICE_ROLE_KEY",
          },
        },
        { status: 500 }
      );
    }

    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const conversationId = formData.get("conversationId") as string | null;
    const extractText = formData.get("extractText") === "true";
    const analyzeWithAI = formData.get("analyzeWithAI") === "true";

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    // Validate file count (max 10 files per request)
    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: "Maximum 10 files allowed per upload" },
        { status: 400 }
      );
    }

    const uploadOptions = {
      userId,
      conversationId: conversationId || undefined,
      extractText,
      analyzeWithAI,
    };

    if (files.length === 1) {
      // Single file upload
      const result = await uploadFile(files[0], uploadOptions);

      if (result.success) {
        return NextResponse.json({
          success: true,
          data: {
            file: result.file,
          },
        });
      } else {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
    } else {
      // Multiple file upload
      const { successful, failed } = await uploadFiles(files, uploadOptions);

      return NextResponse.json({
        success: true,
        data: {
          successful: successful.map((result) => result.file),
          failed: failed.map(({ file, error }) => ({
            filename: file.name,
            error,
          })),
          summary: {
            total: files.length,
            successful: successful.length,
            failed: failed.length,
          },
        },
      });
    }
  } catch (error) {
    console.error("File upload API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}

// Get upload configuration
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFilesPerUpload: 10,
        allowedMimeTypes: [
          // Documents
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
          "text/csv",
          "application/rtf",

          // Images
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",

          // Audio
          "audio/mpeg",
          "audio/wav",
          "audio/ogg",
          "audio/mp4",

          // Video
          "video/mp4",
          "video/mpeg",
          "video/quicktime",
          "video/x-msvideo",

          // Archives
          "application/zip",
          "application/x-rar-compressed",
          "application/x-tar",
          "application/gzip",
        ],
        allowedExtensions: [
          ".pdf",
          ".doc",
          ".docx",
          ".xls",
          ".xlsx",
          ".txt",
          ".csv",
          ".rtf",
          ".jpg",
          ".jpeg",
          ".png",
          ".gif",
          ".webp",
          ".svg",
          ".mp3",
          ".wav",
          ".ogg",
          ".m4a",
          ".mp4",
          ".mpeg",
          ".mov",
          ".avi",
          ".zip",
          ".rar",
          ".tar",
          ".gz",
        ],
      },
    });
  } catch (error) {
    console.error("Upload config API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get upload configuration" },
      { status: 500 }
    );
  }
}
