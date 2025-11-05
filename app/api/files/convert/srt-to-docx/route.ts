import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { convertSrtToDocx } from "@/lib/services/srt-to-docx";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUser();

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data payload" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No subtitle file provided" },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const isSrt =
      extension === "srt" || file.type.includes("subrip") || file.type === "";

    if (!isSrt) {
      return NextResponse.json(
        { error: "Only .srt subtitle files can be converted" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const content = Buffer.from(arrayBuffer).toString("utf-8");

    const { buffer } = await convertSrtToDocx({
      content,
      sourceFileName: file.name,
    });

    const baseName = file.name.replace(/\.[^/.]+$/, "") || "subtitle";
    const downloadName = `${baseName}.docx`.replace(/["\r\n]/g, "_");
    const encodedFileName = encodeURIComponent(downloadName);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="${downloadName}"; filename*=UTF-8''${encodedFileName}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[API] Failed to convert SRT to DOCX:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to convert subtitle file.",
      },
      { status: 500 }
    );
  }
}
