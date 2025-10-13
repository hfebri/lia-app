"use client";

import Tesseract from "tesseract.js";
import * as XLSX from "xlsx";

const isDev = process.env.NODE_ENV !== "production";
const debugLog = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args);
  }
};

// Dynamic import for PDF.js to avoid SSR issues
let pdfjsLib: any = null;

async function loadPDFJS() {
  if (typeof window === "undefined") {
    throw new Error("PDF.js can only be loaded in the browser");
  }

  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    // Use the local worker file served from public directory
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }

  return pdfjsLib;
}

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
  error?: string;
  displayContent?: string;
  promptContent?: string;
}

// Metadata structure for storing in database
export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  extractedText?: string;
  processedAt: string;
  isImage: boolean;
  isDocument: boolean;
  isText: boolean;
  isSpreadsheet: boolean;
  error?: string;
}

export interface FileProcessingProgress {
  stage: string;
  progress: number;
  timeElapsed: number;
}

export class ClientFileProcessor {
  /**
   * Process files on the client side before sending to API
   *
   * OCR is ONLY run for:
   * - Document files (PDF, DOCX, PPTX, etc.)
   * - When using Claude/GPT models (via Replicate)
   *
   * OCR is SKIPPED for:
   * - Image files (all models support natively)
   * - Document files when using Gemini (native support)
   */
  static async processFiles(
    files: File[],
    selectedModel: string,
    onProgress?: (fileName: string, progress: FileProcessingProgress) => void
  ): Promise<ProcessedFile[]> {
    debugLog(`🚀 [CLIENT OCR] Starting client-side file processing for ${files.length} files`);
    
    const processedFiles: ProcessedFile[] = [];

    for (const file of files) {
      debugLog(`\n📁 [CLIENT OCR] Processing: ${file.name} (${file.type})`);
      
      const startTime = Date.now();
      const isImage = this.isImageFile(file);
      const isDocument = this.isDocumentFile(file);
      const isText = this.isTextFile(file);
      const isSpreadsheet = this.isSpreadsheetFile(file);

      const baseProcessedFile: ProcessedFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        isImage,
        isDocument,
        isText,
        isSpreadsheet,
      };

      // Report initial progress immediately
      onProgress?.(file.name, {
        stage: isDocument ? "Preparing document analysis" : "Processing file",
        progress: 1,
        timeElapsed: 0,
      });

      try {
        if (isImage) {
          debugLog(`📸 [CLIENT OCR] Image file detected - no OCR needed`);
          const fileInfo = `📷 Image: ${file.name} (${Math.round(file.size/1024)}KB)`;
          
          processedFiles.push({
            ...baseProcessedFile,
            processingTime: Date.now() - startTime,
            displayContent: fileInfo,
            promptContent: fileInfo,
          });
          
          onProgress?.(file.name, {
            stage: "Complete (Image)",
            progress: 100,
            timeElapsed: Date.now() - startTime,
          });
        } else if (isDocument) {
          const isGeminiModel = selectedModel.toLowerCase().includes('gemini');

          if (isGeminiModel) {
            // Gemini supports documents natively - no OCR needed
            debugLog(`📄 [CLIENT] Document file detected - Gemini native support (no OCR needed)`);

            const fileInfo = `📄 Document: ${file.name} (${Math.round(file.size/1024)}KB) - Native processing`;

            processedFiles.push({
              ...baseProcessedFile,
              processingTime: Date.now() - startTime,
              displayContent: fileInfo,
              promptContent: fileInfo,
            });

            onProgress?.(file.name, {
              stage: "Complete (Native)",
              progress: 100,
              timeElapsed: Date.now() - startTime,
            });
          } else {
            // Claude/GPT models need OCR for documents
            debugLog(`📄 [CLIENT OCR] Document file detected - running OCR for ${selectedModel}`);

            // Show immediate progress for document processing
            onProgress?.(file.name, {
              stage: "Analyzing document",
              progress: 5,
              timeElapsed: Date.now() - startTime,
            });

            const extractedText = await this.runTesseractOCR(file, (progress) => {
              onProgress?.(file.name, {
                stage: progress.status,
                progress: Math.min(100, Math.round((progress.progress || 0) * 100)),
                timeElapsed: Date.now() - startTime,
              });
            });

            const fileInfo = `📄 Document: ${file.name} (${Math.round(file.size/1024)}KB) - Text extracted`;
            const promptInfo = extractedText ? `📄 Document: ${file.name}\n\nExtracted Content:\n${extractedText}` : fileInfo;

            processedFiles.push({
              ...baseProcessedFile,
              extractedText,
              processingTime: Date.now() - startTime,
              displayContent: fileInfo, // Just show file info in chat bubble
              promptContent: promptInfo, // Include full text in prompt
            });

            onProgress?.(file.name, {
              stage: "Complete",
              progress: 100,
              timeElapsed: Date.now() - startTime,
            });
          }
        } else if (isText) {
          debugLog(`📝 [CLIENT] Text file detected - reading content`);

          onProgress?.(file.name, {
            stage: "Reading text file",
            progress: 10,
            timeElapsed: Date.now() - startTime,
          });

          const textContent = await this.readTextFile(file);
          const fileInfo = `📝 Text File: ${file.name} (${Math.round(file.size/1024)}KB)`;
          const promptInfo = textContent ? `${fileInfo}\n\nContent:\n${textContent}` : fileInfo;

          processedFiles.push({
            ...baseProcessedFile,
            extractedText: textContent,
            processingTime: Date.now() - startTime,
            displayContent: fileInfo,
            promptContent: promptInfo,
          });

          onProgress?.(file.name, {
            stage: "Complete (Text)",
            progress: 100,
            timeElapsed: Date.now() - startTime,
          });
        } else if (isSpreadsheet) {
          debugLog(`📊 [CLIENT] Spreadsheet detected - parsing content`);

          onProgress?.(file.name, {
            stage: "Parsing spreadsheet",
            progress: 10,
            timeElapsed: Date.now() - startTime,
          });

          const spreadsheetContent = await this.parseSpreadsheet(file);
          const fileInfo = `📊 Spreadsheet: ${file.name} (${Math.round(file.size/1024)}KB)`;
          const promptInfo = spreadsheetContent ? `${fileInfo}\n\n${spreadsheetContent}` : fileInfo;

          processedFiles.push({
            ...baseProcessedFile,
            extractedText: spreadsheetContent,
            processingTime: Date.now() - startTime,
            displayContent: fileInfo,
            promptContent: promptInfo,
          });

          onProgress?.(file.name, {
            stage: "Complete (Spreadsheet)",
            progress: 100,
            timeElapsed: Date.now() - startTime,
          });
        } else {
          debugLog(`❓ [CLIENT] Unsupported file type: ${file.type}`);
          const errorInfo = `❌ Unsupported file: ${file.name} (${file.type})`;

          processedFiles.push({
            ...baseProcessedFile,
            error: `Unsupported file type: ${file.type}`,
            processingTime: Date.now() - startTime,
            displayContent: errorInfo,
            promptContent: errorInfo,
          });

          onProgress?.(file.name, {
            stage: "Error",
            progress: 100,
            timeElapsed: Date.now() - startTime,
          });
        }
      } catch (error) {
        console.error(`❌ [CLIENT OCR] Error processing ${file.name}:`, error);
        const errorInfo = `❌ Error processing: ${file.name} - ${error instanceof Error ? error.message : "Processing failed"}`;
        
        processedFiles.push({
          ...baseProcessedFile,
          error: error instanceof Error ? error.message : "Processing failed",
          processingTime: Date.now() - startTime,
          displayContent: errorInfo,
          promptContent: errorInfo,
        });

        onProgress?.(file.name, {
          stage: "Error",
          progress: 100,
          timeElapsed: Date.now() - startTime,
        });
      }
    }

    debugLog(`✅ [CLIENT OCR] Completed processing ${files.length} files`);
    return processedFiles;
  }

  /**
   * Run Tesseract OCR on a document file
   */
  private static async runTesseractOCR(
    file: File,
    onProgress: (progress: { status: string; progress?: number }) => void
  ): Promise<string> {
    debugLog(`🚀 [TESSERACT] Starting OCR for: ${file.name}`);
    
    const startTime = Date.now();
    
    try {
      let imagesToProcess: (File | Blob)[] = [];

      // Handle PDF files by converting to images first
      if (file.type === "application/pdf") {
        debugLog(`📄 [PDF CONVERT] Converting PDF to images: ${file.name}`);
        onProgress({ status: "Converting PDF to images", progress: 10 });
        
        imagesToProcess = await this.convertPDFToImages(file, (progress) => {
          // Map PDF conversion progress to 10-40% of total progress
          const mappedProgress = 10 + (progress * 0.3);
          onProgress({ status: "Converting PDF to images", progress: mappedProgress });
        });
        
        debugLog(`✅ [PDF CONVERT] Converted PDF to ${imagesToProcess.length} images`);
        onProgress({ status: "PDF converted, starting OCR", progress: 40 });
      } else {
        // For image files, process directly
        imagesToProcess = [file];
      }

      // Process all images with OCR
      const allTexts: string[] = [];
      
      for (let i = 0; i < imagesToProcess.length; i++) {
        const image = imagesToProcess[i];
        const pageNumber = imagesToProcess.length > 1 ? ` (page ${i + 1}/${imagesToProcess.length})` : "";
        
        debugLog(`🔍 [TESSERACT] Processing image${pageNumber}...`);
        onProgress({ 
          status: `OCR processing${pageNumber}`, 
          progress: (i / imagesToProcess.length) * 100 
        });

        const {
          data: { text },
        } = await Tesseract.recognize(image, "eng", {
          logger: (m) => {
            const elapsed = Date.now() - startTime;
            debugLog(
              `🔧 [TESSERACT] [${file.name}${pageNumber}] ${m.status} (${Math.round((m.progress || 0) * 100)}%) - ${elapsed}ms`
            );
            
            // Forward Tesseract progress to our progress callback
            // Reserve 40-99% for OCR processing (60% total)
            const ocrStartProgress = 40;
            const ocrTotalRange = 59; // 99 - 40
            const baseProgress = (i / imagesToProcess.length) * ocrTotalRange;
            const pageProgress = (m.progress || 0) * (ocrTotalRange / imagesToProcess.length);
            const totalProgress = Math.min(99, ocrStartProgress + baseProgress + pageProgress);
            
            
            onProgress({ 
              status: `${m.status}${pageNumber}`, 
              progress: totalProgress
            });
          },
        });

        if (text.trim()) {
          allTexts.push(text.trim());
        }
      }

      const combinedText = allTexts.join("\n\n--- Page Break ---\n\n");
      const processingTime = Date.now() - startTime;
      
      debugLog(`✅ [TESSERACT] OCR completed for: ${file.name}`);
      debugLog(`📊 [TESSERACT] Extracted ${combinedText.length} characters from ${imagesToProcess.length} page(s) in ${processingTime}ms`);
      debugLog(`📄 [TESSERACT] Text preview: "${combinedText.substring(0, 100)}..."`);

      onProgress({ status: "Complete", progress: 100 });
      return combinedText;
    } catch (error) {
      console.error(`❌ [TESSERACT] OCR failed for ${file.name}:`, error);
      throw error;
    }
  }

  /**
   * Convert PDF to images using PDF.js
   */
  private static async convertPDFToImages(
    pdfFile: File,
    onProgress: (progress: number) => void
  ): Promise<Blob[]> {
    // Load PDF.js dynamically
    const pdfLib = await loadPDFJS();
    
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfLib.getDocument({ data: arrayBuffer }).promise;
    
    debugLog(`📖 [PDF CONVERT] PDF has ${pdf.numPages} pages`);
    const images: Blob[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      debugLog(`🖼️  [PDF CONVERT] Converting page ${pageNum}/${pdf.numPages}`);
      
      const page = await pdf.getPage(pageNum);
      const scale = 2.0; // Higher scale for better OCR accuracy
      const viewport = page.getViewport({ scale });

      // Create canvas
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      images.push(blob);
      onProgress((pageNum / pdf.numPages) * 100);
    }

    return images;
  }

  /**
   * Create enhanced prompt with file content (for AI processing)
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

    enhancedPrompt += "Please analyze this content and respond to my question above.\n";

    return enhancedPrompt;
  }

  /**
   * Create display content for chat message (without extracted text)
   */
  static createDisplayContent(processedFiles: ProcessedFile[]): string {
    if (processedFiles.length === 0) {
      return "";
    }

    const fileInfos = processedFiles.map(file => file.displayContent || `📄 ${file.name}`);
    return fileInfos.join("\n");
  }

  /**
   * Convert processed files to metadata for database storage
   */
  static toMetadata(processedFiles: ProcessedFile[]): FileMetadata[] {
    return processedFiles.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.url, // Include URL for images uploaded to Supabase
      data: file.data, // Include base64 data if available
      extractedText: file.extractedText,
      processedAt: new Date().toISOString(),
      isImage: file.isImage,
      isDocument: file.isDocument,
      isText: file.isText,
      isSpreadsheet: file.isSpreadsheet,
      error: file.error,
    }));
  }

  /**
   * Check if file is an image
   */
  private static isImageFile(file: File): boolean {
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
   * Check if file is a document that can be processed with OCR
   */
  private static isDocumentFile(file: File): boolean {
    const documentTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "application/vnd.ms-powerpoint", // .ppt
    ];
    return documentTypes.includes(file.type.toLowerCase());
  }

  /**
   * Check if file is a text file
   */
  private static isTextFile(file: File): boolean {
    const textTypes = [
      "text/plain",
      "text/csv",
      "text/rtf",
      "application/rtf",
      "text/markdown",
      "text/x-markdown",
    ];

    // Also check file extension for files with generic mime types
    const fileName = file.name.toLowerCase();
    const textExtensions = ['.txt', '.csv', '.rtf', '.md', '.markdown'];

    return textTypes.includes(file.type.toLowerCase()) ||
           textExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Check if file is a spreadsheet
   */
  private static isSpreadsheetFile(file: File): boolean {
    const spreadsheetTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
    ];

    // Also check file extension
    const fileName = file.name.toLowerCase();
    const spreadsheetExtensions = ['.xlsx', '.xls', '.xlsm'];

    return spreadsheetTypes.includes(file.type.toLowerCase()) ||
           spreadsheetExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Read text file content
   */
  private static async readTextFile(file: File): Promise<string> {
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
  private static async parseSpreadsheet(file: File): Promise<string> {
    try {
      // Read file as array buffer
      const buffer = await file.arrayBuffer();

      // Parse workbook
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Convert all sheets to formatted text
      let result = '';

      workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];

        // Add sheet header
        if (workbook.SheetNames.length > 1) {
          result += `\n${'='.repeat(60)}\n`;
          result += `Sheet ${index + 1}: ${sheetName}\n`;
          result += `${'='.repeat(60)}\n\n`;
        }

        // Convert to CSV format (easier to read than JSON)
        const csv = XLSX.utils.sheet_to_csv(sheet);
        result += csv;

        if (index < workbook.SheetNames.length - 1) {
          result += '\n';
        }
      });

      return result;
    } catch (error) {
      console.error('Error parsing spreadsheet:', error);
      throw new Error(`Failed to parse spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
