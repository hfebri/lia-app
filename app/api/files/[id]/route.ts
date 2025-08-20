import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getFileById, deleteFile } from "@/lib/services/file-upload";
import { db } from "@/db/db";
import { files } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/files/[id] - Get file details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const { id } = await params;

    const file = await getFileById(id, userId);

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
        uploadStatus: file.uploadStatus,
        analysisStatus: file.analysisStatus,
        extractedText: file.extractedText,
        metadata: file.metadata,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get file API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get file" },
      { status: 500 }
    );
  }
}

// PUT /api/files/[id] - Update file metadata
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const { id } = await params;
    const body = await request.json();
    const { analysisStatus, metadata } = body;

    // Verify file ownership
    const existingFile = await getFileById(id, userId);
    if (!existingFile) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    // Update file
    const updates: any = {
      updatedAt: new Date(),
    };

    if (analysisStatus) {
      updates.analysisStatus = analysisStatus;
    }

    if (metadata) {
      updates.metadata = metadata;
    }

    const [updatedFile] = await db
      .update(files)
      .set(updates)
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .returning();

    if (!updatedFile) {
      return NextResponse.json(
        { success: false, error: "Failed to update file" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedFile.id,
        filename: updatedFile.filename,
        originalName: updatedFile.originalName,
        mimeType: updatedFile.mimeType,
        size: updatedFile.size,
        uploadStatus: updatedFile.uploadStatus,
        analysisStatus: updatedFile.analysisStatus,
        extractedText: updatedFile.extractedText,
        metadata: updatedFile.metadata,
        createdAt: updatedFile.createdAt,
        updatedAt: updatedFile.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update file API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update file" },
      { status: 500 }
    );
  }
}

// DELETE /api/files/[id] - Delete file
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const { id } = await params;

    const success = await deleteFile(id, userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "File not found or deletion failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
