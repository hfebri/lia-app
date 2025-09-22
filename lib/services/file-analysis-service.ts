import type { AIProviderName } from "../ai/types";
import Replicate from "replicate";
import Tesseract from "tesseract.js";

export interface FileAnalysisResult {
  extractedText: string;
  markdownContent: string;
  success: boolean;
  error?: string;
}

export interface FileContent {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
}

/**
 * Service to handle file analysis for different AI providers
 * Gemini handles file analysis natively, while Replicate needs special handling
 */
export class FileAnalysisService {
  private replicateClient?: Replicate;

  // Available models for file analysis
  private static readonly MARKER_MODEL =
    "cuuupid/marker:4eb62a42c3e5b8695a796936e69afa2c004839aef15410f01492d59783baf752";

  // Current active model (switch between 'tesseract' and 'marker')
  private static readonly ACTIVE_MODEL: "tesseract" | "marker" = "tesseract";

  constructor() {
    // Initialize Replicate client for file analysis
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    if (replicateToken) {
      this.replicateClient = new Replicate({
        auth: replicateToken,
      });
    }
  }

  /**
   * Analyze files based on the provider being used
   */
  async analyzeFiles(
    files: FileContent[],
    provider: AIProviderName,
    model: string
  ): Promise<FileAnalysisResult[]> {
    console.log(`🔍 FILE ANALYSIS DEBUG - Analyzing ${files.length} files:`);
    console.log(`- Provider: ${provider}`);
    console.log(`- Model: ${model}`);
    console.log(
      `- Files:`,
      files.map((f) => `${f.name} (${f.type})`)
    );

    const results: FileAnalysisResult[] = [];

    for (const file of files) {
      console.log(`\n📁 Processing file: ${file.name} (${file.type})`);
      try {
        let result: FileAnalysisResult;
        if (provider === "gemini") {
          console.log(`✅ Gemini provider - handling all files natively`);
          // Gemini handles all files natively - no preprocessing needed
          result = {
            extractedText: "",
            markdownContent: `File: ${file.name} (${file.type})\nSize: ${file.size} bytes\n\n[File will be processed natively by Gemini]`,
            success: true,
          };
        } else if (this.isImageFile(file)) {
          console.log(
            `✅ ${provider.toUpperCase()} + Image - handling natively`
          );
          // All providers handle image files natively
          result = {
            extractedText: "",
            markdownContent: `Image file: ${file.name} (${file.type})\nSize: ${
              file.size
            } bytes\n\n[Image will be processed natively by ${provider.toUpperCase()}]`,
            success: true,
          };
        } else {
          // Use selected model to extract content for all non-Gemini, non-image files
          console.log(
            `🔧 Using ${FileAnalysisService.ACTIVE_MODEL} for processing document`
          );
          console.log(`📊 File analysis details:`);
          console.log(`  - File name: ${file.name}`);
          console.log(`  - File type: ${file.type}`);
          console.log(`  - File size: ${file.size} bytes`);
          console.log(`  - Is image file: ${this.isImageFile(file)}`);
          console.log(`  - Is document file: ${this.isDocumentFile(file)}`);
          console.log(`  - Active model: ${FileAnalysisService.ACTIVE_MODEL}`);

          if (FileAnalysisService.ACTIVE_MODEL === "marker") {
            console.log(`🚀 Starting Marker model processing...`);
            result = await this.analyzeFileWithMarker(file);
          } else {
            console.log(`🚀 Starting Tesseract OCR processing...`);
            result = await this.analyzeFileWithTesseract(file);
          }
        }

        results.push(result);
      } catch (error) {
        results.push({
          extractedText: "",
          markdownContent: "",
          success: false,
          error:
            error instanceof Error ? error.message : "File analysis failed",
        });
      }
    }

    return results;
  }

  /**
   * Use Tesseract OCR to analyze document files and extract text content
   */
  private async analyzeFileWithTesseract(
    file: FileContent
  ): Promise<FileAnalysisResult> {
    console.log(
      `\n🚀 [TESSERACT START] Beginning OCR analysis for: ${file.name}`
    );
    console.log(
      `📝 [TESSERACT] File details: ${file.type}, ${file.size} bytes`
    );

    try {
      // Check if file is a document type that Tesseract can handle
      console.log(`🔍 [TESSERACT] Checking file type compatibility...`);
      if (!this.isDocumentFile(file)) {
        console.log(
          `❌ [TESSERACT] File type ${file.type} not supported by Tesseract OCR`
        );
        return {
          extractedText: "",
          markdownContent: "",
          success: false,
          error:
            "File type not supported by Tesseract OCR. Only document files (PDF, DOCX, PPTX) are supported.",
        };
      }

      console.log(`✅ [TESSERACT] File type ${file.type} is supported`);
      console.log(`🔍 [TESSERACT] Starting OCR processing for: ${file.name}`);
      const startTime = Date.now();

      // Convert base64 to buffer for Tesseract (Node.js compatible)
      console.log(
        `📦 [TESSERACT] Converting base64 to buffer for file: ${file.name}`
      );
      console.log(
        `📦 [TESSERACT] Base64 data length: ${file.data.length} characters`
      );

      const buffer = Buffer.from(file.data, "base64");
      console.log(`📦 [TESSERACT] Buffer created successfully`);
      console.log(
        `📊 [TESSERACT] Buffer details: size=${buffer.length} bytes, type=${file.type}`
      );

      // Use Tesseract to extract text
      console.log(
        `🚀 [TESSERACT] Starting Tesseract.recognize() for: ${file.name}`
      );
      console.log(`🔧 [TESSERACT] Language: eng, Options: logger enabled`);

      const recognitionStart = Date.now();
      const {
        data: { text },
      } = await Tesseract.recognize(buffer, "eng", {
        logger: (m) => {
          const progressText = m.progress
            ? `(${Math.round(m.progress * 100)}%)`
            : "";
          const elapsed = Date.now() - recognitionStart;
          console.log(
            `🔧 [TESSERACT PROGRESS] [${file.name}] ${m.status} ${progressText} - ${elapsed}ms elapsed`
          );
        },
      });

      const recognitionEnd = Date.now();
      const recognitionTime = recognitionEnd - recognitionStart;
      console.log(`✅ [TESSERACT] OCR recognition completed for: ${file.name}`);
      console.log(`⏱️  [TESSERACT] Recognition time: ${recognitionTime}ms`);

      const endTime = Date.now();
      const processingTime = endTime - startTime;
      console.log(`⏱️  [TESSERACT] Total processing time: ${processingTime}ms`);

      const cleanContent = text.trim();
      console.log(
        `📝 [TESSERACT] Extracted text length: ${text.length} characters`
      );
      console.log(
        `📝 [TESSERACT] Clean content length: ${cleanContent.length} characters`
      );

      if (!cleanContent) {
        console.log(
          `❌ [TESSERACT] No text content extracted from document: ${file.name}`
        );
        return {
          extractedText: "",
          markdownContent: "",
          success: false,
          error: "No text content extracted from document",
        };
      }

      console.log(
        `📄 [TESSERACT] Text preview (first 100 chars): "${cleanContent.substring(
          0,
          100
        )}..."`
      );

      // Format as markdown with analysis details
      console.log(`📝 [TESSERACT] Formatting content as markdown...`);
      const markdownContent = this.formatAsMarkdownForTesseract(
        file.name,
        file.type,
        cleanContent,
        processingTime
      );

      console.log(
        `✅ [TESSERACT COMPLETE] Successfully processed: ${file.name}`
      );
      console.log(
        `📊 [TESSERACT SUMMARY] ${cleanContent.length} chars extracted in ${processingTime}ms`
      );

      return {
        extractedText: cleanContent,
        markdownContent: markdownContent,
        success: true,
      };
    } catch (error) {
      console.log(
        `❌ [TESSERACT ERROR] Failed to process ${file.name}:`,
        error
      );
      console.log(
        `💥 [TESSERACT ERROR] Error type: ${
          error instanceof Error ? error.constructor.name : typeof error
        }`
      );
      console.log(
        `💥 [TESSERACT ERROR] Error message: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return {
        extractedText: "",
        markdownContent: "",
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Tesseract OCR analysis failed",
      };
    }
  }

  /**
   * Use Marker model to extract text from files
   */
  private async analyzeFileWithMarker(
    file: FileContent
  ): Promise<FileAnalysisResult> {
    if (!this.replicateClient) {
      return {
        extractedText: "",
        markdownContent: "",
        success: false,
        error: "Replicate client not initialized",
      };
    }

    try {
      // Create a data URL for the file
      const dataUrl = `data:${file.type};base64,${file.data}`;

      // Prepare input for Marker model (it expects 'document' parameter and parallel_factor)
      const input = {
        document: dataUrl,
        parallel_factor: 10, // Parallel processing factor for speed
      };

      const startTime = Date.now();

      // Run Marker model for file analysis
      const output = (await this.replicateClient.run(
        FileAnalysisService.MARKER_MODEL,
        { input }
      )) as { markdown?: string } | string;

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Handle the response - Marker returns an object with markdown URL or direct content
      let content = "";
      if (typeof output === "object" && output.markdown) {
        // If markdown is a URL, fetch the content
        if (output.markdown.startsWith("http")) {
          const response = await fetch(output.markdown);
          content = await response.text();
        } else {
          content = output.markdown;
        }
      } else if (typeof output === "string") {
        content = output;
      }

      const cleanContent = content.trim();

      if (!cleanContent) {
        return {
          extractedText: "",
          markdownContent: "",
          success: false,
          error: "No content extracted from file",
        };
      }

      // Format as markdown with analysis details
      const markdownContent = this.formatAsMarkdownForMarker(
        file.name,
        file.type,
        cleanContent,
        processingTime
      );

      return {
        extractedText: cleanContent,
        markdownContent: markdownContent,
        success: true,
      };
    } catch (error) {
      return {
        extractedText: "",
        markdownContent: "",
        success: false,
        error: `Marker analysis failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Format the extracted content as markdown for Tesseract OCR
   */
  private formatAsMarkdownForTesseract(
    fileName: string,
    fileType: string,
    content: string,
    processingTime: number
  ): string {
    const timestamp = new Date().toISOString();

    return `# Document Analysis: ${fileName}

**File Type:** ${fileType}
**Analyzed:** ${timestamp}
**Analysis Method:** Tesseract OCR
**Processing Time:** ${processingTime}ms

---

## Extracted Text Content

${content}

---

*Document text extraction completed using Tesseract.js OCR for local, fast document processing.*
`;
  }

  /**
   * Format the extracted content as markdown for Marker model
   */
  private formatAsMarkdownForMarker(
    fileName: string,
    fileType: string,
    content: string,
    processingTime: number
  ): string {
    const timestamp = new Date().toISOString();

    return `# File Analysis: ${fileName}

**File Type:** ${fileType}
**Analyzed:** ${timestamp}
**Analysis Method:** Marker Model (cuuupid/marker)
**Processing Time:** ${processingTime}ms

---

## Extracted Content

${content}

---

*File analysis completed using Marker AI model for high-speed document processing.*
`;
  }

  /**
   * Create enhanced prompt with file analysis content for AI conversation
   */
  createEnhancedPrompt(
    originalPrompt: string,
    fileAnalysisResults: FileAnalysisResult[]
  ): string {
    if (fileAnalysisResults.length === 0) {
      return originalPrompt;
    }

    const successfulAnalyses = fileAnalysisResults.filter(
      (result) => result.success
    );

    if (successfulAnalyses.length === 0) {
      return originalPrompt;
    }

    let enhancedPrompt = originalPrompt;

    // Add file context to the prompt
    enhancedPrompt += "\n\n## Attached File Analysis\n\n";
    enhancedPrompt +=
      "The following files have been analyzed and their content extracted:\n\n";

    successfulAnalyses.forEach((result, index) => {
      enhancedPrompt += `### File ${index + 1} Analysis\n\n`;
      enhancedPrompt += result.markdownContent;
      enhancedPrompt += "\n\n";
    });

    enhancedPrompt +=
      "Please consider the above file content when responding to the user's message.\n";

    return enhancedPrompt;
  }

  /**
   * Check if provider needs file preprocessing
   */
  static needsFilePreprocessing(provider: AIProviderName): boolean {
    return provider !== "gemini";
  }

  /**
   * Check if provider supports native file handling
   */
  static supportsNativeFileHandling(provider: AIProviderName): boolean {
    // Only Gemini supports all file types natively
    // Claude and OpenAI support images natively, but documents need OCR
    return provider === "gemini";
  }

  /**
   * Check if file is an image
   */
  private isImageFile(file: FileContent): boolean {
    const imageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/svg+xml",
    ];
    return imageTypes.includes(file.type.toLowerCase());
  }

  /**
   * Check if file is a document that Tesseract can process
   */
  private isDocumentFile(file: FileContent): boolean {
    const documentTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "application/vnd.ms-powerpoint", // .ppt
    ];
    const isDocument = documentTypes.includes(file.type.toLowerCase());

    console.log(
      `🔍 [FILE TYPE CHECK] Checking if ${file.name} (${file.type}) is a document...`
    );
    console.log(
      `📋 [FILE TYPE CHECK] Supported document types: ${documentTypes.join(
        ", "
      )}`
    );
    console.log(
      `✅ [FILE TYPE CHECK] Result: ${
        isDocument ? "DOCUMENT" : "NOT A DOCUMENT"
      }`
    );

    return isDocument;
  }
}

// Export singleton instance
export const fileAnalysisService = new FileAnalysisService();
