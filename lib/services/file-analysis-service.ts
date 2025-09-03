import type { AIProviderName } from "../ai/types";
import Replicate from "replicate";

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
  private static readonly DOLPHIN_MODEL =
    "bytedance/dolphin:19f1ad93970c2bf21442a842d01d97fb04a94a69d2b36dee43531a9cbae07e85";
  private static readonly MARKER_MODEL =
    "cuuupid/marker:4eb62a42c3e5b8695a796936e69afa2c004839aef15410f01492d59783baf752";

  // Current active model (switch between 'dolphin' and 'marker')
  private static readonly ACTIVE_MODEL: "dolphin" | "marker" = "dolphin";

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
    const results: FileAnalysisResult[] = [];

    for (const file of files) {
      try {
        let result: FileAnalysisResult;

        if (provider === "gemini") {
          // Gemini handles files natively - no preprocessing needed
          result = {
            extractedText: "",
            markdownContent: `File: ${file.name} (${file.type})\nSize: ${file.size} bytes\n\n[File will be processed natively by Gemini]`,
            success: true,
          };
        } else if (model.includes("claude") && this.isImageFile(file)) {
          // For Claude models with image files: Skip Dolphin analysis, let Claude handle natively
          result = {
            extractedText: "",
            markdownContent: `Image file: ${file.name} (${file.type})\nSize: ${file.size} bytes\n\n[Image will be processed natively by Claude - skipping Dolphin analysis]`,
            success: true,
          };
        } else {
          // Use selected model to extract content for all non-Gemini, non-Claude-image files
          if (FileAnalysisService.ACTIVE_MODEL === "marker") {
            result = await this.analyzeFileWithMarker(file);
          } else {
            result = await this.analyzeFileWithDolphin(file);
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
   * Use Bytedance Dolphin model to analyze file and extract content in markdown format
   */
  private async analyzeFileWithDolphin(
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

      // Prepare input for Dolphin model (it expects a 'file' parameter with URL)
      const input = {
        file: dataUrl,
      };

      // Run Dolphin model for file analysis
      const output = (await this.replicateClient.run(
        FileAnalysisService.DOLPHIN_MODEL,
        { input }
      )) as string | string[];

      // Handle the response
      const content = Array.isArray(output) ? output.join("") : String(output);
      const cleanContent = content.trim();

      // Extract markdown content and text
      const markdownContent = this.formatAsMarkdown(
        file.name,
        file.type,
        cleanContent
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
        error:
          error instanceof Error ? error.message : "Dolphin analysis failed",
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
   * Create a prompt for file analysis using Dolphin model
   */
  private createFileAnalysisPrompt(fileName: string, fileType: string): string {
    const basePrompt = `Analyze this ${fileType} file named "${fileName}" and extract its content in a structured markdown format.

Please provide:
1. A clear description of what you see
2. Extract all visible text content
3. Describe any images, diagrams, or visual elements
4. Identify key sections, headings, or structure
5. Format the output in clean markdown

Focus on being comprehensive and accurate. If it's a document, extract all text. If it's an image, describe it thoroughly.`;

    // Customize prompt based on file type
    if (fileType.includes("pdf")) {
      return (
        basePrompt +
        "\n\nThis is a PDF document. Extract all text content and maintain the document structure."
      );
    } else if (fileType.includes("image")) {
      return (
        basePrompt +
        "\n\nThis is an image file. Describe what you see in detail and extract any text visible in the image."
      );
    } else if (fileType.includes("document") || fileType.includes("word")) {
      return (
        basePrompt +
        "\n\nThis is a document file. Extract all text content and preserve formatting structure."
      );
    }

    return basePrompt;
  }

  /**
   * Format the extracted content as markdown
   */
  private formatAsMarkdown(
    fileName: string,
    fileType: string,
    content: string
  ): string {
    const timestamp = new Date().toISOString();

    return `# File Analysis: ${fileName}

**File Type:** ${fileType}
**Analyzed:** ${timestamp}
**Analysis Method:** Bytedance Dolphin Model

---

## Extracted Content

${content}

---

*File analysis completed using ByteDance Dolphin AI vision model for non-Gemini provider compatibility.*
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
}

// Export singleton instance
export const fileAnalysisService = new FileAnalysisService();
