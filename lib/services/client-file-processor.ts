"use client";

import * as XLSX from "xlsx";

export interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  url?: string;
  data?: string;
  extractedText?: string;
  isImage: boolean;
  isDocument: boolean;
  isText: boolean;
  isSpreadsheet: boolean;
  processingTime?: number;
  error?: string | null;
  displayContent?: string;
  promptContent?: string;
}

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  url?: string;
  data?: string;
  extractedText?: string;
  processedAt: string;
  isImage: boolean;
  isDocument: boolean;
  isText: boolean;
  isSpreadsheet: boolean;
  error?: string | null;
}

export interface FileProcessingProgress {
  stage: string;
  progress: number;
  timeElapsed?: number;
  message?: string;
}

export class ClientFileProcessor {
  /**
   * Create enhanced prompt content that includes processed file summaries.
   */
  static createEnhancedPrompt(
    originalPrompt: string,
    processedFiles: ProcessedFile[]
  ): string {
    const filesWithContent = processedFiles.filter(
      (file) => file.promptContent && !file.error
    );

    if (filesWithContent.length === 0) {
      return originalPrompt;
    }

    let enhancedPrompt = originalPrompt;
    enhancedPrompt += "\n\n## Document Content\n\n";
    enhancedPrompt += "I've processed the following files:\n\n";

    filesWithContent.forEach((file, index) => {
      enhancedPrompt += `### File ${index + 1}: ${file.promptContent}\n\n`;
    });

    enhancedPrompt +=
      "Please analyze this content and respond to my question above.\n";

    return enhancedPrompt;
  }

  /**
   * Create display content for chat messages based on processed files.
   */
  static createDisplayContent(processedFiles: ProcessedFile[]): string {
    if (processedFiles.length === 0) {
      return "";
    }

    const fileInfos = processedFiles.map(
      (file) => file.displayContent || `📄 ${file.name}`
    );
    return fileInfos.join("\n");
  }

  /**
   * Convert processed file details into metadata suitable for persistence.
   */
  static toMetadata(processedFiles: ProcessedFile[]): FileMetadata[] {
    return processedFiles.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.url,
      data: file.data,
      // Map promptContent to extractedText for metadata storage
      // This ensures file context is preserved in follow-up messages
      extractedText: file.extractedText || file.promptContent,
      processedAt: new Date().toISOString(),
      isImage: file.isImage,
      isDocument: file.isDocument,
      isText: file.isText,
      isSpreadsheet: file.isSpreadsheet,
      error: file.error,
    }));
  }

  /**
   * Check if file is a text file (CSV, TXT, MD, etc.)
   */
  static isTextFile(file: File): boolean {
    const textTypes = [
      "text/plain",
      "text/csv",
      "text/rtf",
      "application/rtf",
      "text/markdown",
      "text/x-markdown",
    ];

    const fileName = file.name.toLowerCase();
    const textExtensions = [".txt", ".csv", ".rtf", ".md", ".markdown"];

    return (
      textTypes.includes(file.type.toLowerCase()) ||
      textExtensions.some((ext) => fileName.endsWith(ext))
    );
  }

  /**
   * Check if file is a spreadsheet (XLSX, XLS)
   */
  static isSpreadsheetFile(file: File): boolean {
    const spreadsheetTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
    ];

    const fileName = file.name.toLowerCase();
    const spreadsheetExtensions = [".xlsx", ".xls", ".xlsm"];

    return (
      spreadsheetTypes.includes(file.type.toLowerCase()) ||
      spreadsheetExtensions.some((ext) => fileName.endsWith(ext))
    );
  }

  /**
   * Read text file content
   */
  static async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content || "");
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Parse spreadsheet file and convert to formatted text
   */
  static async parseSpreadsheet(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      let result = "";

      workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];

        if (workbook.SheetNames.length > 1) {
          result += `\n${"=".repeat(60)}\n`;
          result += `Sheet ${index + 1}: ${sheetName}\n`;
          result += `${"=".repeat(60)}\n\n`;
        }

        const csv = XLSX.utils.sheet_to_csv(sheet);
        result += csv;

        if (index < workbook.SheetNames.length - 1) {
          result += "\n";
        }
      });

      return result;
    } catch (error) {
      console.error("Error parsing spreadsheet:", error);
      throw new Error(
        `Failed to parse spreadsheet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
