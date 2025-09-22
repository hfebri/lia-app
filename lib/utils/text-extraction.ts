// Use dynamic imports to avoid module load-time errors

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
        return await extractFromPDF(buffer);

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
async function extractFromPDF(buffer: Buffer): Promise<TextExtractionResult> {
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
      console.log(
        `📄 [PDF] Successfully extracted ${wordCount} words from text-based PDF`
      );
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
    console.log(
      `📄 [PDF] Got only ${wordCount} words, attempting OCR fallback for scanned PDF`
    );

    try {
      // Try to use OCR on the PDF buffer directly
      // Note: This is a simplified approach. A more robust solution would convert
      // PDF pages to images first, but Tesseract can handle some PDF files directly
      const ocrResult = await extractFromImage(
        buffer,
        "application/pdf",
        "scanned.pdf"
      );

      if (
        ocrResult.success &&
        ocrResult.text &&
        ocrResult.text.length > text.length
      ) {
        console.log(
          `✅ [PDF OCR] Successfully extracted text from scanned PDF using OCR`
        );
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
            extractionMethod: "OCR (scanned PDF)",
          },
        };
      }
    } catch (ocrError) {
      console.log(`❌ [PDF OCR] OCR fallback failed:`, ocrError);
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
  try {
    console.log(`🚀 [OCR] Starting Tesseract OCR for image: ${filename}`);
    const startTime = Date.now();

    // Dynamically import Tesseract to avoid SSR issues
    const Tesseract = await import("tesseract.js");

    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => {
        const elapsed = Date.now() - startTime;
        console.log(
          `🔧 [OCR] [${filename}] ${m.status} (${Math.round(
            (m.progress || 0) * 100
          )}%) - ${elapsed}ms`
        );
      },
    });

    const cleanText = text.trim();
    const processingTime = Date.now() - startTime;

    console.log(`✅ [OCR] Completed OCR for: ${filename}`);
    console.log(
      `📊 [OCR] Extracted ${cleanText.length} characters in ${processingTime}ms`
    );

    if (!cleanText) {
      return {
        success: false,
        error: "No text content found in image",
      };
    }

    const wordCount = cleanText
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      success: true,
      text: cleanText,
      metadata: {
        wordCount,
        charCount: cleanText.length,
      },
    };
  } catch (error) {
    console.error(`❌ [OCR] Error processing image ${filename}:`, error);
    return {
      success: false,
      error: `OCR extraction failed: ${
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
