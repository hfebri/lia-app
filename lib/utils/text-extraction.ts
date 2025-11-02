import { MarkerOCRService } from "@/lib/services/marker-ocr";

// Use dynamic imports to avoid module load-time errors

let markerService: MarkerOCRService | null = null;

function getMarkerService(): MarkerOCRService {
  if (!markerService) {
    markerService = MarkerOCRService.create();
  }
  return markerService;
}

export interface TextExtractionResult {
  success: boolean;
  text?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    charCount?: number;
    author?: string;
    title?: string;
    creationDate?: Date;
  };
  error?: string;
}

/**
 * Extract text from various file types
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<TextExtractionResult> {
  try {
    switch (mimeType) {
      case "application/pdf":
        return await extractFromPDF(buffer, filename);

      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return await extractFromWord(buffer);

      case "application/vnd.ms-excel":
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return await extractFromExcel(buffer);

      case "text/plain":
      case "text/csv":
        return await extractFromText(buffer);

      case "application/rtf":
        return await extractFromRTF(buffer);

      // Image files - use OCR
      case "image/jpeg":
      case "image/jpg":
      case "image/png":
      case "image/gif":
      case "image/webp":
      case "image/bmp":
      case "image/tiff":
        return await extractFromImage(buffer, mimeType, filename);

      default:
        return {
          success: false,
          error: `Unsupported file type: ${mimeType}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}

/**
 * Extract text from PDF files
 */
async function extractFromPDF(
  buffer: Buffer,
  filename: string
): Promise<TextExtractionResult> {
  try {
    const pdf = await import("pdf-parse");
    const data = await pdf.default(buffer);

    const text = data.text.trim();

    // Check if we got meaningful text content
    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // If we have substantial text content, return it
    if (wordCount > 10) {
      return {
        success: true,
        text,
        metadata: {
          pageCount: data.numpages,
          wordCount,
          charCount: text.length,
          title: data.info?.Title,
          author: data.info?.Author,
          creationDate: data.info?.CreationDate
            ? new Date(data.info.CreationDate)
            : undefined,
        },
      };
    }

    // If we got little or no text, this might be a scanned PDF - try OCR fallback
    try {
      // Try to use Marker OCR on the PDF buffer directly
      const ocrResult = await runMarkerOCR(
        buffer,
        "application/pdf",
        filename,
        "accurate"
      );

      if (
        ocrResult.success &&
        ocrResult.text &&
        ocrResult.text.length > text.length
      ) {
        return {
          success: true,
          text: ocrResult.text,
          metadata: {
            pageCount: data.numpages,
            wordCount: ocrResult.metadata?.wordCount || 0,
            charCount: ocrResult.text.length,
            title: data.info?.Title,
            author: data.info?.Author,
            creationDate: data.info?.CreationDate
              ? new Date(data.info.CreationDate)
              : undefined,
          },
        };
      }
    } catch (ocrError) {
      // OCR fallback failed, will use regular extraction
    }

    // Return the regular extraction result even if minimal
    return {
      success: true,
      text,
      metadata: {
        pageCount: data.numpages,
        wordCount,
        charCount: text.length,
        title: data.info?.Title,
        author: data.info?.Author,
        creationDate: data.info?.CreationDate
          ? new Date(data.info.CreationDate)
          : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `PDF extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Extract text from Word documents
 */
async function extractFromWord(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();
    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      success: true,
      text,
      metadata: {
        wordCount,
        charCount: text.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Word document extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Extract text from Excel files
 */
async function extractFromExcel(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const textParts: string[] = [];

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetText = XLSX.utils.sheet_to_txt(worksheet);
      if (sheetText.trim()) {
        textParts.push(`Sheet: ${sheetName}\n${sheetText}`);
      }
    });

    const text = textParts.join("\n\n").trim();
    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      success: true,
      text,
      metadata: {
        wordCount,
        charCount: text.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Excel extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Extract text from plain text files
 */
async function extractFromText(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    const text = buffer.toString("utf-8").trim();
    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      success: true,
      text,
      metadata: {
        wordCount,
        charCount: text.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Text extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Extract text from RTF files (basic implementation)
 */
async function extractFromRTF(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    const rtfContent = buffer.toString("utf-8");

    // Basic RTF to text conversion (removes RTF control codes)
    const text = rtfContent
      .replace(/\\[a-z]+\d*\s?/g, "") // Remove RTF control words
      .replace(/[{}]/g, "") // Remove braces
      .replace(/\\\\/g, "\\") // Unescape backslashes
      .replace(/\\'/g, "'") // Unescape quotes
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      success: true,
      text,
      metadata: {
        wordCount,
        charCount: text.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `RTF extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Get summary statistics from extracted text
 */
export function getTextStatistics(text: string): {
  wordCount: number;
  charCount: number;
  lineCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
} {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const sentences = text
    .split(/[.!?]+/)
    .filter((sentence) => sentence.trim().length > 0);
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter((para) => para.trim().length > 0);

  return {
    wordCount: words.length,
    charCount: text.length,
    lineCount: lines.length,
    paragraphCount: paragraphs.length,
    avgWordsPerSentence:
      sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
  };
}

/**
 * Extract text from image files using OCR
 */
async function extractFromImage(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<TextExtractionResult> {
  return runMarkerOCR(buffer, mimeType, filename, "fast");
}

async function runMarkerOCR(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  mode: "fast" | "balanced" | "accurate" = "fast"
): Promise<TextExtractionResult> {
  if (!MarkerOCRService.isSupportedFileType(mimeType)) {
    return {
      success: false,
      error: `Marker OCR does not support files of type ${mimeType}`,
    };
  }

  try {
    const service = getMarkerService();
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    const result = await service.processFile(dataUrl, {
      mode,
      force_ocr: true,
      include_metadata: true,
    });

    const rawContent = (result.markdown || "").trim();

    if (!rawContent) {
      return {
        success: false,
        error: "No text content extracted from document",
      };
    }

    const wordCount = rawContent
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      success: true,
      text: rawContent,
      metadata: {
        wordCount,
        charCount: rawContent.length,
        pageCount: result.metadata?.pages,
      },
    };
  } catch (error) {
    console.error(`❌ [Marker OCR] Error processing ${filename}:`, error);
    return {
      success: false,
      error: `Marker OCR failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Extract key phrases from text (simple implementation)
 */
export function extractKeyPhrases(
  text: string,
  maxPhrases: number = 10
): string[] {
  // Simple keyword extraction - in production you might want to use a more sophisticated NLP library
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  // Count word frequency
  const wordCount: Record<string, number> = {};
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Get most frequent words
  const sortedWords = Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxPhrases)
    .map(([word]) => word);

  return sortedWords;
}
