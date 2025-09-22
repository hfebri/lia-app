"use client";

import Tesseract from "tesseract.js";

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
  extractedText?: string;
  isImage: boolean;
  isDocument: boolean;
  processingTime?: number;
  error?: string;
  // For display purposes
  displayContent?: string; // What to show in the chat bubble (just file info, no extracted text)
  // For prompt purposes  
  promptContent?: string; // What to include in the AI prompt (full extracted text)
}

export interface FileProcessingProgress {
  stage: string;
  progress: number;
  timeElapsed: number;
}

export class ClientFileProcessor {
  /**
   * Process files on the client side before sending to API
   */
  static async processFiles(
    files: File[],
    onProgress?: (fileName: string, progress: FileProcessingProgress) => void
  ): Promise<ProcessedFile[]> {
    console.log(`🚀 [CLIENT OCR] Starting client-side file processing for ${files.length} files`);
    
    const processedFiles: ProcessedFile[] = [];

    for (const file of files) {
      console.log(`\n📁 [CLIENT OCR] Processing: ${file.name} (${file.type})`);
      
      const startTime = Date.now();
      const isImage = this.isImageFile(file);
      const isDocument = this.isDocumentFile(file);
      
      const baseProcessedFile: ProcessedFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        isImage,
        isDocument,
      };

      // Report initial progress immediately
      onProgress?.(file.name, {
        stage: isDocument ? "Preparing for OCR processing" : "Processing file",
        progress: 1,
        timeElapsed: 0,
      });

      try {
        if (isImage) {
          console.log(`📸 [CLIENT OCR] Image file detected - no OCR needed`);
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
          console.log(`📄 [CLIENT OCR] Document file detected - running Tesseract OCR`);
          
          // Show immediate progress for document processing
          onProgress?.(file.name, {
            stage: "Starting OCR analysis",
            progress: 5,
            timeElapsed: Date.now() - startTime,
          });
          
          const extractedText = await this.runTesseractOCR(file, (progress) => {
            onProgress?.(file.name, {
              stage: progress.status,
              progress: Math.round((progress.progress || 0) * 100),
              timeElapsed: Date.now() - startTime,
            });
          });

          const fileInfo = `📄 Document: ${file.name} (${Math.round(file.size/1024)}KB) - Text extracted with OCR`;
          const promptInfo = extractedText ? `📄 Document: ${file.name}\n\nExtracted Content:\n${extractedText}` : fileInfo;

          console.log(`🔍 [DEBUG] File processing result for ${file.name}:`);
          console.log(`🔍 [DEBUG] - extractedText length: ${extractedText?.length || 0}`);
          console.log(`🔍 [DEBUG] - extractedText preview: "${extractedText?.substring(0, 200) || 'EMPTY'}"`);
          console.log(`🔍 [DEBUG] - displayContent: ${fileInfo}`);
          console.log(`🔍 [DEBUG] - promptContent length: ${promptInfo.length}`);

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
        } else {
          console.log(`❓ [CLIENT OCR] Unsupported file type: ${file.type}`);
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

    console.log(`✅ [CLIENT OCR] Completed processing ${files.length} files`);
    return processedFiles;
  }

  /**
   * Run Tesseract OCR on a document file
   */
  private static async runTesseractOCR(
    file: File,
    onProgress: (progress: { status: string; progress?: number }) => void
  ): Promise<string> {
    console.log(`🚀 [TESSERACT] Starting OCR for: ${file.name}`);
    
    const startTime = Date.now();
    
    try {
      let imagesToProcess: (File | Blob)[] = [];

      // Handle PDF files by converting to images first
      if (file.type === "application/pdf") {
        console.log(`📄 [PDF CONVERT] Converting PDF to images: ${file.name}`);
        onProgress({ status: "Converting PDF to images", progress: 10 });
        
        imagesToProcess = await this.convertPDFToImages(file, (progress) => {
          // Map PDF conversion progress to 10-40% of total progress
          const mappedProgress = 10 + (progress * 0.3);
          onProgress({ status: "Converting PDF to images", progress: mappedProgress });
        });
        
        console.log(`✅ [PDF CONVERT] Converted PDF to ${imagesToProcess.length} images`);
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
        
        console.log(`🔍 [TESSERACT] Processing image${pageNumber}...`);
        onProgress({ 
          status: `OCR processing${pageNumber}`, 
          progress: (i / imagesToProcess.length) * 100 
        });

        const {
          data: { text },
        } = await Tesseract.recognize(image, "eng", {
          logger: (m) => {
            const elapsed = Date.now() - startTime;
            console.log(
              `🔧 [TESSERACT] [${file.name}${pageNumber}] ${m.status} (${Math.round((m.progress || 0) * 100)}%) - ${elapsed}ms`
            );
            
            // Forward Tesseract progress to our progress callback
            // Reserve 40-99% for OCR processing (60% total)
            const ocrStartProgress = 40;
            const ocrTotalRange = 59; // 99 - 40
            const baseProgress = (i / imagesToProcess.length) * ocrTotalRange;
            const pageProgress = (m.progress || 0) * (ocrTotalRange / imagesToProcess.length);
            const totalProgress = Math.min(99, ocrStartProgress + baseProgress + pageProgress);
            
            console.log(`🔧 [DEBUG PROGRESS] Page ${i + 1}/${imagesToProcess.length}: baseProgress=${baseProgress.toFixed(1)}, pageProgress=${pageProgress.toFixed(1)}, totalProgress=${totalProgress.toFixed(1)}`);
            
            onProgress({ 
              status: `${m.status}${pageNumber}`, 
              progress: totalProgress
            });
          },
        });

        console.log(`🔍 [DEBUG] OCR result for page ${i + 1}: "${text.substring(0, 100)}..." (${text.length} chars)`);
        
        if (text.trim()) {
          allTexts.push(text.trim());
          console.log(`✅ [DEBUG] Added page ${i + 1} text to results (${text.trim().length} chars)`);
        } else {
          console.log(`⚠️ [DEBUG] Page ${i + 1} returned empty text`);
        }
      }

      const combinedText = allTexts.join("\n\n--- Page Break ---\n\n");
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [TESSERACT] OCR completed for: ${file.name}`);
      console.log(`📊 [TESSERACT] Extracted ${combinedText.length} characters from ${imagesToProcess.length} page(s) in ${processingTime}ms`);
      console.log(`📄 [TESSERACT] Text preview: "${combinedText.substring(0, 100)}..."`);

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
    
    console.log(`📖 [PDF CONVERT] PDF has ${pdf.numPages} pages`);
    const images: Blob[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`🖼️  [PDF CONVERT] Converting page ${pageNum}/${pdf.numPages}`);
      
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
}