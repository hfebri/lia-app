"use client";

import { useState, useCallback, useRef } from "react";
import {
  ChatService,
  type ChatMessage,
  type StreamingChatResponse,
} from "@/lib/ai/chat-service";
import type { ReasoningEffort } from "@/components/chat/reasoning-effort-selector";
import type { ProcessedFile, FileProcessingProgress } from "@/lib/services/client-file-processor";

interface UseAiChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  isProcessingFiles: boolean; // New state for file processing
  fileProcessingProgress: Record<string, FileProcessingProgress>; // Track OCR progress per file
  streamingContent: string;
  error: string | null;
  selectedModel: string;
  availableModels: any[];
  extendedThinking: boolean; // Claude-exclusive
  webSearch: boolean; // Claude & OpenAI - web search capability
  thinkingMode: boolean; // Gemini-exclusive
  reasoningEffort: ReasoningEffort;
  currentConversationId: string | null; // Track current conversation
  currentConversationModel: string | null; // Track model used in current conversation
  systemInstruction: string; // System instruction for conversation
}

interface UseAiChatOptions {
  initialModel?: string;
  maxMessages?: number;
  autoScroll?: boolean;
  onConversationCreated?: (conversationData: { id: string; title: string | null }) => void;
  preCreateConversation?: (params: { title: string; aiModel: string }) => Promise<{ id: string; title?: string | null } | null>;
}

// Helper function to save chat messages to database
const saveChatToDatabase = async (
  userMessage: { content: string; metadata?: any },
  assistantMessage: { content: string; metadata?: any },
  conversationId?: string,
  aiModel?: string
) => {
  const response = await fetch("/api/chat/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      userMessage,
      assistantMessage,
      aiModel, // Include AI model in the request
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save chat to database");
  }

  return response.json();
};

export function useAiChat(options: UseAiChatOptions = {}) {
  const {
    initialModel = "gpt-5",
    maxMessages = 100,
    autoScroll = true,
    onConversationCreated,
    preCreateConversation,
  } = options;

  // Get saved model from localStorage or use initial model
  const getSavedModel = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lia-selectedModel") || initialModel;
    }
    return initialModel;
  };

  const [state, setState] = useState<UseAiChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    isProcessingFiles: false,
    fileProcessingProgress: {},
    streamingContent: "",
    error: null,
    selectedModel: getSavedModel(),
    availableModels: [],
    extendedThinking: false,
    webSearch: false,
    thinkingMode: false,
    reasoningEffort: "medium",
    currentConversationId: null,
    currentConversationModel: null,
    systemInstruction: "",
  });

  const chatService = useRef(ChatService.getInstance());
  const abortController = useRef<AbortController | null>(null);

  const createConversationTitle = useCallback((message: string) => {
    const normalized = message.trim().replace(/\s+/g, " ");
    if (!normalized) {
      return "New Chat";
    }
    return normalized.length > 50
      ? `${normalized.slice(0, 47)}...`
      : normalized;
  }, []);

  // Load available models
  const loadModels = useCallback(async () => {
    try {
      const modelsData = await chatService.current.getAvailableModels();
      // Filter out Gemini models from the available models list
      const filteredModels = modelsData.models.filter(
        (model: any) => !model.id.toLowerCase().includes('gemini')
      );
      setState((prev) => ({
        ...prev,
        availableModels: filteredModels,
        selectedModel: prev.selectedModel || modelsData.defaultModel,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load models",
      }));
    }
  }, []);

  /**
   * Detect if the user is referencing specific files in their message
   * Returns array of matching file names
   *
   * TODO: Future enhancement - implement fuzzy filename matching
   */
  const detectFileReferences = useCallback(
    (message: string, availableFiles: Array<{ name: string; type: string }>) => {
      const lowerMessage = message.toLowerCase();
      const referencedFiles: string[] = [];

      for (const file of availableFiles) {
        const fileName = file.name.toLowerCase();

        // Exact filename match (case-insensitive)
        if (lowerMessage.includes(fileName)) {
          referencedFiles.push(file.name);
          continue;
        }

        // Extension-based match (e.g., "the CSV file")
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension) {
          const extensionPatterns = [
            `${extension} file`,
            `the ${extension}`,
            `.${extension}`,
          ];

          if (extensionPatterns.some(pattern => lowerMessage.includes(pattern))) {
            referencedFiles.push(file.name);
          }
        }
      }

      return [...new Set(referencedFiles)]; // Remove duplicates
    },
    []
  );

  // Build file context from all previous messages in conversation
  // Uses smart summarization to reduce token usage
  const buildConversationFileContext = useCallback(async (currentMessage?: string) => {
    const allFiles = state.messages
      .filter((msg) => msg.role === "user" && msg.metadata?.files)
      .flatMap((msg) => msg.metadata!.files!);

    if (allFiles.length === 0) return "";

    // Import token utilities
    const { estimateTokenCount, truncateFileContent, DEFAULT_TOKEN_LIMITS } = await import("@/lib/utils/token-estimation");

    // Detect if user is referencing specific files in current message
    const referencedFiles = currentMessage
      ? detectFileReferences(currentMessage, allFiles)
      : [];

    // Build context with smart summary/full content selection
    const filesWithContent = allFiles.map((file, idx) => {
      const isReferenced = referencedFiles.includes(file.name);
      const hasError = !!file.error;

      // Use full content if:
      // 1. User specifically mentioned this file, OR
      // 2. File has no summary available
      const useFullContent = isReferenced || !file.summary;

      const content = useFullContent
        ? (file.extractedText || "No text extracted")
        : (file.summary || "No text extracted");

      const contentType = useFullContent ? "Full Content" : "Summary";
      const errorSuffix = hasError ? " (Error)" : "";

      return {
        name: file.name,
        content,
        header: `[File ${idx + 1}: ${file.name} - ${contentType}${errorSuffix}]`,
        timestamp: new Date(file.processedAt || Date.now()).getTime(),
      };
    });

    // Estimate total tokens BEFORE building context
    const totalTokens = filesWithContent.reduce(
      (sum, f) => sum + estimateTokenCount(f.content),
      0
    );

    // Apply truncation if exceeds token budget
    const maxFileTokens = DEFAULT_TOKEN_LIMITS.maxFileTokens;
    let finalFiles = filesWithContent;

    if (totalTokens > maxFileTokens) {
      console.warn(`[Context Builder] Token limit exceeded: ${totalTokens} > ${maxFileTokens}. Applying truncation.`);

      // Track truncation event
      const { trackFileContextEvent } = await import("@/lib/utils/file-context-analytics");
      trackFileContextEvent("truncation_event", {
        originalTokens: totalTokens,
        maxTokens: maxFileTokens,
        filesAffected: filesWithContent.length,
      });

      // Truncate file content to fit within budget
      // IMPORTANT: Add unique index to prevent collisions with duplicate filenames
      const filesWithIndex = filesWithContent.map((f, idx) => ({
        name: f.name,
        content: f.content,
        timestamp: f.timestamp,
        uniqueKey: `${idx}_${f.name}_${f.timestamp}`, // Stable unique identifier
      }));

      const truncated = truncateFileContent(
        filesWithIndex,
        maxFileTokens
      );

      // Debug logging to verify uniqueKey preservation
      if (process.env.DEBUG_FILE_CONTEXT === 'true' || process.env.NEXT_PUBLIC_DEBUG_FILE_CONTEXT === 'true') {
        console.log('[Context Builder] Truncation debug:', {
          originalFiles: filesWithIndex.map(f => ({ name: f.name, uniqueKey: f.uniqueKey })),
          truncatedFiles: truncated.map(t => ({ name: t.name, uniqueKey: t.uniqueKey, hasKey: !!t.uniqueKey })),
        });
      }

      // IMPORTANT: truncateFileContent reorders by recency, can't use index
      // Use uniqueKey instead of name to handle duplicate filenames correctly
      // Each file gets a stable identifier (idx_name_timestamp) that survives reordering
      const truncatedByKey = new Map<string, string>(
        truncated.map((t) => {
          if (!t.uniqueKey) {
            console.warn(`[Context Builder] Missing uniqueKey for file: ${t.name}. Falling back to name (may cause issues with duplicates).`);
          }
          // Use uniqueKey if available, fall back to name only as last resort
          const key = t.uniqueKey || t.name;
          return [key, t.content];
        })
      );

      finalFiles = filesWithContent.map((f, idx) => {
        const uniqueKey = `${idx}_${f.name}_${f.timestamp}`;
        const truncatedContent = truncatedByKey.get(uniqueKey);
        if (!truncatedContent && f.name === filesWithContent[idx - 1]?.name) {
          // Potential duplicate filename issue
          console.warn(`[Context Builder] Could not find truncated content for duplicate file: ${f.name} (key: ${uniqueKey})`);
        }
        return {
          ...f,
          content: truncatedContent || f.content,
        };
      });
    }

    // Build final context string
    const context = finalFiles
      .map(f => `${f.header}\n${f.content}`)
      .join("\n\n---\n\n");

    // Calculate final token count
    const finalTokens = estimateTokenCount(context);

    // Track context built event
    const { trackFileContextEvent } = await import("@/lib/utils/file-context-analytics");
    trackFileContextEvent("context_built", {
      totalFiles: allFiles.length,
      referencedFiles: referencedFiles.length,
      filesUsingSummary: allFiles.filter(f => f.summary && !referencedFiles.includes(f.name)).length,
      filesUsingFullContent: allFiles.filter(f => !f.summary || referencedFiles.includes(f.name)).length,
      totalTokens: finalTokens,
      truncated: totalTokens > maxFileTokens,
    });

    // Track file reference detection if any files were referenced
    if (referencedFiles.length > 0) {
      trackFileContextEvent("file_reference_detected", {
        referencedFiles,
        message: currentMessage,
      });
    }

    // Log context building decision for debugging
    if (process.env.DEBUG_FILE_CONTEXT === 'true' || process.env.NEXT_PUBLIC_DEBUG_FILE_CONTEXT === 'true') {
      console.log('[Context Builder]', {
        totalFiles: allFiles.length,
        referencedFiles,
        filesUsingSummary: allFiles.filter(f => f.summary && !referencedFiles.includes(f.name)).length,
        filesUsingFullContent: allFiles.filter(f => !f.summary || referencedFiles.includes(f.name)).length,
        originalTokens: totalTokens,
        finalTokens,
        truncated: totalTokens > maxFileTokens,
      });
    }

    return `\n\n[CONVERSATION CONTEXT - Available Files]\n${context}\n[END CONVERSATION CONTEXT]\n\n`;
  }, [state.messages, detectFileReferences]);

  // Check if a file has already been processed in this conversation
  const isFileAlreadyProcessed = useCallback(
    (file: File): boolean => {
      return state.messages.some(
        (msg) =>
          msg.metadata?.files?.some(
            (f) =>
              f.name === file.name &&
              f.size === file.size &&
              f.extractedText &&
              !f.error
          )
      );
    },
    [state.messages]
  );

  // Send a message with streaming response
  const sendMessage = useCallback(
    async (content: string, files?: File[], stream: boolean = true) => {
      // Validate message
      const validation = chatService.current.validateMessage(content);
      if (!validation.isValid) {
        setState((prev) => ({
          ...prev,
          error: validation.error || "Invalid message",
        }));
        return;
      }

      // Process files client-side FIRST before creating message
      let finalContent = content;
      let processedFiles: ProcessedFile[] = [];
      let conversationId = state.currentConversationId;
      let conversationPreCreated = false;
      let conversationTitle: string | null = null;

      if (!conversationId && preCreateConversation) {
        const draftTitle = createConversationTitle(content);
        try {
          const newConversation = await preCreateConversation({
            title: draftTitle,
            aiModel: state.selectedModel,
          });

          if (newConversation?.id) {
            conversationId = newConversation.id;
            conversationTitle = newConversation.title ?? draftTitle;
            conversationPreCreated = true;

            if (onConversationCreated) {
              onConversationCreated({
                id: newConversation.id,
                title: conversationTitle,
              });
            }
          }
        } catch (error) {
          console.warn("Failed to pre-create conversation:", error);
        }
      }

      const placeholderMessage = chatService.current.createMessage(
        "user",
        content
      );

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, placeholderMessage].slice(-maxMessages),
        currentConversationModel:
          prev.currentConversationModel || prev.selectedModel,
        isLoading: true,
        isProcessingFiles: !!(files && files.length > 0),
        fileProcessingProgress: {},
        isStreaming: false,
        streamingContent: "",
        error: null,
      }));

      // ALWAYS include file context if conversation has files (even without new uploads)
      // Pass current message to enable smart file reference detection
      const fileContext = await buildConversationFileContext(content);
      if (fileContext && (!files || files.length === 0)) {
        // No new files, but conversation has files - include context
        finalContent = content + fileContext;
      }

      if (files && files.length > 0) {
        // Upload images with base64 data to Supabase to get URLs first
        const imageFilesWithData = files.filter(file =>
          file.type.startsWith('image/') &&
          !(file as any).url &&
          (file as any).data
        );

        if (imageFilesWithData.length > 0) {
          for (const file of imageFilesWithData) {
            try {
              // Convert base64 to Blob
              const base64Data = (file as any).data;
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: file.type });

              // Create FormData
              const formData = new FormData();
              formData.append('file', blob, file.name);

              // Upload to Supabase
              const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData,
              });

              const uploadResult = await uploadResponse.json();

              if (uploadResult.success) {
                (file as any).url = uploadResult.url;
                delete (file as any).data;
              } else {
                console.error("Failed to upload image:", uploadResult.error);
              }
            } catch (error) {
              console.error("Error uploading image:", error);
            }
          }
        }

        // Now separate files after upload
        const filesWithUrls = files.filter(file => (file as any).url);
        const filesWithData = files.filter(file => !(file as any).url && (file as any).data);
        const filesNeedingProcessing = files.filter(file => !(file as any).url && !(file as any).data && !isFileAlreadyProcessed(file));

        // Convert files with URLs to ProcessedFile format
        if (filesWithUrls.length > 0) {
          const filesFromUrls = filesWithUrls.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            url: (file as any).url,
            data: undefined,
            extractedText: "",
            isImage: file.type.startsWith("image/"),
            isDocument: false,
            isText: false,
            isSpreadsheet: false,
          }));
          processedFiles.push(...filesFromUrls);
        }

        // Convert files with base64 data to ProcessedFile format
        if (filesWithData.length > 0) {
          const filesFromData = filesWithData.map(file => {
            const base64Data = (file as any).data;
            return {
              name: file.name,
              type: file.type,
              size: file.size,
              url: undefined,
              data: base64Data,
              extractedText: "",
              isImage: file.type.startsWith("image/"),
              isDocument: false,
              isText: false,
              isSpreadsheet: false,
            };
          });
          processedFiles.push(...filesFromData);
        }

        // Filter out already-processed files
        const filesToProcess = filesNeedingProcessing;

        // Initialize progress for files that need processing
        const initialProgress: Record<string, any> = {};
        filesToProcess.forEach(file => {
          initialProgress[file.name] = {
            stage: "Initializing...",
            progress: 0,
            timeElapsed: 0,
          };
        });

        setState((prev) => ({
          ...prev,
          isProcessingFiles: filesToProcess.length > 0,
          fileProcessingProgress: initialProgress,
          error: null,
        }));


        try {
          // Process files: Upload to Supabase and get OCR results from backend
          if (filesToProcess.length > 0) {
            for (const file of filesToProcess) {
              setState((prev) => ({
                ...prev,
                fileProcessingProgress: {
                  ...prev.fileProcessingProgress,
                  [file.name]: {
                    stage: "uploading",
                    progress: 10,
                    message: "Uploading file...",
                  },
                },
              }));

              // Upload file to Supabase
              const formData = new FormData();
              formData.append("files", file); // API expects "files" field name

              const uploadResponse = await fetch("/api/files/upload", {
                method: "POST",
                body: formData,
              });

              if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(`Failed to upload ${file.name}: ${errorData.error || 'Unknown error'}`);
              }

              const uploadData = await uploadResponse.json();
              const fileUrl = uploadData.data.file.url;

              // Process with OCR if needed
              setState((prev) => ({
                ...prev,
                fileProcessingProgress: {
                  ...prev.fileProcessingProgress,
                  [file.name]: {
                    stage: "processing",
                    progress: 60,
                    message: "Extracting text...",
                  },
                },
              }));

              let extractedText = "";
              let base64Data = undefined;

              const { ClientFileProcessor } = await import("@/lib/services/client-file-processor");
              const isImage = file.type.startsWith("image/");
              const isText = ClientFileProcessor.isTextFile(file);
              const isSpreadsheet = ClientFileProcessor.isSpreadsheetFile(file);

              if (isImage) {
                // For images, convert to base64 to send directly to AI provider
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                  reader.onload = () => {
                    const base64 = (reader.result as string).split(",")[1];
                    resolve(base64);
                  };
                  reader.readAsDataURL(file);
                });
                base64Data = await base64Promise;
              } else if (isText) {
                // For text files (CSV, TXT, MD), read directly on client
                setState((prev) => ({
                  ...prev,
                  fileProcessingProgress: {
                    ...prev.fileProcessingProgress,
                    [file.name]: {
                      stage: "processing",
                      progress: 70,
                      message: "Reading text content...",
                    },
                  },
                }));
                extractedText = await ClientFileProcessor.readTextFile(file);
              } else if (isSpreadsheet) {
                // For spreadsheets (XLSX, XLS), parse on client
                setState((prev) => ({
                  ...prev,
                  fileProcessingProgress: {
                    ...prev.fileProcessingProgress,
                    [file.name]: {
                      stage: "processing",
                      progress: 70,
                      message: "Parsing spreadsheet...",
                    },
                  },
                }));
                extractedText = await ClientFileProcessor.parseSpreadsheet(file);
              } else {
                // For documents (PDF, DOC, DOCX, PPT, PPTX), use Marker OCR
                const ocrResponse = await fetch("/api/files/ocr", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    fileUrl,
                    fileName: file.name,
                    mimeType: file.type,
                    mode: "fast",
                  }),
                });

                if (ocrResponse.ok) {
                  const ocrData = await ocrResponse.json();
                  extractedText = ocrData.data.extractedText;
                } else {
                  const errorData = await ocrResponse.json();
                  console.error(`OCR failed for ${file.name}:`, errorData);
                  // Continue without extracted text - at least upload succeeded
                }
              }

              // Generate AI summary for large text content (server-side)
              let summary: string | undefined;
              let summaryTokens: number | undefined;
              let usingSummary = false;

              if (extractedText && !isImage) {
                // Only summarize text-based content (not images)
                // IMPORTANT: Summarization MUST be server-side to protect API keys
                setState((prev) => ({
                  ...prev,
                  fileProcessingProgress: {
                    ...prev.fileProcessingProgress,
                    [file.name]: {
                      stage: "summarizing",
                      progress: 85,
                      message: "Generating AI summary...",
                    },
                  },
                }));

                try {
                  const startTime = Date.now();

                  // Track summarization request
                  const { trackFileContextEvent } = await import("@/lib/utils/file-context-analytics");
                  trackFileContextEvent("summarization_request", {
                    fileName: file.name,
                    fileType: file.type,
                  });

                  // Call server-side summarization API
                  const summaryResponse = await fetch("/api/files/summarize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      content: extractedText,
                      fileName: file.name,
                      mimeType: file.type,
                    }),
                  });

                  if (summaryResponse.ok) {
                    const summaryData = await summaryResponse.json();
                    const summaryResult = summaryData.data;

                    if (!summaryResult.skipped) {
                      summary = summaryResult.summary;
                      summaryTokens = summaryResult.summaryTokens;
                      usingSummary = true;

                      // Track success
                      const latency = Date.now() - startTime;
                      trackFileContextEvent("summarization_success", {
                        fileName: file.name,
                        originalTokens: summaryResult.originalTokens,
                        summaryTokens: summaryResult.summaryTokens,
                        latency,
                        hadError: !!summaryResult.error,
                      });
                    }
                  } else {
                    const errorData = await summaryResponse.json();
                    console.error(`[File Processing] Summarization API failed for ${file.name}:`, errorData);

                    // Track error
                    trackFileContextEvent("summarization_error", {
                      fileName: file.name,
                      error: errorData.error || "API request failed",
                    });
                  }
                } catch (error) {
                  console.error(`[File Processing] Summarization failed for ${file.name}:`, error);

                  // Track error
                  const { trackFileContextEvent } = await import("@/lib/utils/file-context-analytics");
                  trackFileContextEvent("summarization_error", {
                    fileName: file.name,
                    error: error instanceof Error ? error.message : "Unknown error",
                  });
                  // Continue without summary - fallback to full content
                }
              }

              processedFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                url: fileUrl,
                data: base64Data, // Only set for images
                extractedText: extractedText || undefined, // Store extracted text from OCR
                promptContent: extractedText || file.name,
                displayContent: file.name,
                isImage: isImage,
                isDocument: !isImage && !isText && !isSpreadsheet,
                isText: isText,
                isSpreadsheet: isSpreadsheet,
                error: null,
                // Summarization fields
                summary,
                summaryTokens,
                usingSummary,
              });

              setState((prev) => ({
                ...prev,
                fileProcessingProgress: {
                  ...prev.fileProcessingProgress,
                  [file.name]: {
                    stage: "complete",
                    progress: 100,
                    message: "Complete",
                  },
                },
              }));
            }
          }

          // Get conversation file context (from all previous messages)
          // Pass current message to enable smart file reference detection
          const fileContext = await buildConversationFileContext(content);

          // Create enhanced prompt with:
          // 1. Conversation file context (all files from previous messages)
          // 2. New extracted text from newly uploaded files
          let enhancedContent = content;

          // Add conversation file context first (if any files exist in conversation)
          if (fileContext) {
            enhancedContent = content + fileContext;
          }

          // Then add newly processed files
          if (processedFiles.length > 0) {
            const filesWithContent = processedFiles.filter(
              (file) => file.promptContent && file.promptContent !== file.name
            );

            if (filesWithContent.length > 0) {
              enhancedContent += "\n\n## Document Content\n\n";
              enhancedContent += "I've processed the following files:\n\n";

              filesWithContent.forEach((file, index) => {
                enhancedContent += `### File ${index + 1}: ${file.name}\n\n${file.promptContent}\n\n`;
              });
            }
          }

          finalContent = enhancedContent;

          // For display in chat bubble, only show filenames
          let displayContent = content;
          if (processedFiles.length > 0) {
            displayContent = `${content}\n\n📎 Attached files:\n${processedFiles.map(f => `• ${f.name}`).join('\n')}`;
          }

          (processedFiles as any).displayForMessage = displayContent;

        } catch (error) {
          console.error("File processing failed:", error);
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : "File processing failed",
            isProcessingFiles: false,
            fileProcessingProgress: {},
          }));
          return;
        }
      }

      // Create user message - use display content for UI
      const userMessageContent = (processedFiles as any).displayForMessage || content;
      const userMessage = chatService.current.createMessage("user", userMessageContent);

      // Add file metadata to user message
      if (processedFiles.length > 0) {
        const { ClientFileProcessor } = await import("@/lib/services/client-file-processor");
        userMessage.metadata = {
          files: ClientFileProcessor.toMetadata(processedFiles),
        };
      }

      // For AI processing, only send files that the provider can actually process natively
      // - OpenAI: Only images
      // - Anthropic (Claude): Images and PDFs
      // - For all other files: The extracted text is already in finalContent
      const isOpenAI = state.selectedModel.startsWith("gpt-");
      const isAnthropic = state.selectedModel.startsWith("claude-");

      const fileDataForAI = processedFiles
        .filter(f => f.url || f.data)
        .filter(file => {
          const isImage = file.type.startsWith("image/");
          const isPDF = file.type === "application/pdf";

          if (isOpenAI) {
            // OpenAI only supports images natively
            return isImage;
          } else if (isAnthropic) {
            // Anthropic supports images and PDFs natively
            return isImage || isPDF;
          }

          // For other providers, don't send file data (text is already in content)
          return false;
        })
        .map(file => ({
          url: file.url,
          data: file.data,
          type: file.type,
          name: file.name,
          size: file.size,
        }));

      const messagesForAI = [
        ...state.messages,
        chatService.current.createMessage("user", finalContent, {
          files: fileDataForAI.length > 0 ? fileDataForAI as any : undefined
        })
      ].slice(-maxMessages);

      setState((prev) => ({
        ...prev,
        messages: prev.messages
          .map((msg) => (msg.id === placeholderMessage.id ? userMessage : msg))
          .slice(-maxMessages),
        currentConversationId: conversationId || prev.currentConversationId,
        currentConversationModel:
          prev.currentConversationModel || prev.selectedModel,
        isProcessingFiles: false,
        fileProcessingProgress: {},
      }));

      // Abort any ongoing request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      try {
        // Use messagesForAI which contains the enhanced prompt with extracted text
        const allMessages = messagesForAI;

        if (stream) {
          // Handle streaming response
          let accumulatedContent = "";

          const streamGenerator = chatService.current.sendStreamingMessage(
            allMessages,
            {
              model: state.selectedModel,
              extended_thinking: state.extendedThinking,
              thinking_budget_tokens: state.extendedThinking ? 10000 : undefined,
              enable_web_search: state.webSearch,
              thinking_mode: state.thinkingMode,
              reasoning_effort: state.reasoningEffort,
              systemInstruction: state.systemInstruction,
            }
          );

          for await (const chunk of streamGenerator) {
            if (abortController.current?.signal.aborted) {
              break;
            }

            accumulatedContent += chunk.content;

            setState((prev) => ({
              ...prev,
              streamingContent: accumulatedContent,
              isLoading: !chunk.isComplete,
              isStreaming: !chunk.isComplete,
              isProcessingFiles: false, // Files are done processing once streaming starts
            }));

            // Create or update assistant message when complete
            if (chunk.isComplete) {
              // Only create message if there's content
              if (accumulatedContent.trim()) {
                const assistantMessage = chatService.current.createMessage(
                  "assistant",
                  accumulatedContent,
                  {
                    model: state.selectedModel,
                    usage: chunk.usage,
                  }
                );

                setState((prev) => ({
                  ...prev,
                  messages: [...prev.messages, assistantMessage].slice(
                    -maxMessages
                  ),
                  streamingContent: "",
                  isLoading: false,
                  isStreaming: false,
                }));

                // Save both messages to database after streaming is complete
                try {
                  const result = await saveChatToDatabase(
                    userMessage,
                    assistantMessage,
                    conversationId || undefined,
                    state.selectedModel // Pass the selected AI model
                  );
                  // Update conversation ID if this was the first message
                  if (
                    result.success &&
                    !conversationId &&
                    result.data?.conversationId
                  ) {
                    conversationId = result.data.conversationId;
                    const persistedTitle = result.data.title || null;

                    setState((prev) => ({
                      ...prev,
                      currentConversationId: conversationId,
                    }));

                    if (onConversationCreated && !conversationPreCreated) {
                      onConversationCreated({
                        id: conversationId as string,
                        title: persistedTitle,
                      });
                    }
                  }
                } catch (error) {
                  console.warn(
                    "Failed to save streaming chat to database:",
                    error
                  );
                  // Don't break the chat flow if database save fails
                }
              } else {
                // Stream completed but no content - just clear the loading state
                setState((prev) => ({
                  ...prev,
                  streamingContent: "",
                  isLoading: false,
                  isStreaming: false,
                }));
              }
              break; // Exit loop when complete
            }
          }
        } else {
          // Handle non-streaming response
          const response = await chatService.current.sendMessage(allMessages, {
            model: state.selectedModel,
            extended_thinking: state.extendedThinking,
            thinking_budget_tokens: state.extendedThinking ? 10000 : undefined,
            enable_web_search: state.webSearch,
            thinking_mode: state.thinkingMode,
            reasoning_effort: state.reasoningEffort,
          });

          const assistantMessage = chatService.current.createMessage(
            "assistant",
            response.content,
            {
              model: response.model,
              usage: response.usage,
            }
          );

          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, assistantMessage].slice(-maxMessages),
            isLoading: false,
            isProcessingFiles: false, // Ensure file processing state is cleared
          }));

          // Save both messages to database after AI response is received
          try {
            const result = await saveChatToDatabase(
              userMessage,
              assistantMessage,
              conversationId || undefined,
              state.selectedModel // Pass the selected AI model
            );
            // Update conversation ID if this was the first message
            if (
              result.success &&
              !conversationId &&
              result.data?.conversationId
            ) {
              conversationId = result.data.conversationId;
              const persistedTitle = result.data.title || null;

              setState((prev) => ({
                ...prev,
                currentConversationId: conversationId,
              }));

              if (onConversationCreated && !conversationPreCreated) {
                onConversationCreated({
                  id: conversationId as string,
                  title: persistedTitle,
                });
              }
            }
          } catch (error) {
            console.warn("Failed to save chat to database:", error);
            // Don't break the chat flow if database save fails
          }
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to send message",
          isLoading: false,
          isStreaming: false,
          isProcessingFiles: false, // Clear file processing state on error
          streamingContent: "",
        }));
      }
    },
    [
      state.messages,
      state.selectedModel,
      state.systemInstruction,
      state.extendedThinking,
      state.thinkingMode,
      state.reasoningEffort,
      state.currentConversationId,
      maxMessages,
      onConversationCreated,
      preCreateConversation,
      createConversationTitle,
      buildConversationFileContext,
      isFileAlreadyProcessed,
    ]
  );

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
      streamingContent: "",
    }));
  }, []);

  // Change selected model
  const changeModel = useCallback(
    (modelId: string, onConversationCleared?: () => void) => {
      // If changing to a different model, always start new conversation
      const isDifferentModel = state.selectedModel !== modelId;

      if (isDifferentModel) {
        // Save selected model to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("lia-selectedModel", modelId);
        }

        // First, call the callback to notify that conversation will be cleared
        // This ensures URL changes happen before state updates
        if (onConversationCleared) {
          onConversationCleared();
        }

        // Then update the state to clear conversation and set new model
        setState((prev) => ({
          ...prev,
          selectedModel: modelId,
          messages: [],
          currentConversationId: null, // Always clear conversation ID on model change
          currentConversationModel: modelId, // Set the new conversation model
          error: null,
          streamingContent: "",
          systemInstruction: "", // Clear system instruction on model change
          // Reset model-specific settings when switching models
          extendedThinking: false,
          webSearch: false,
          thinkingMode: false,
          reasoningEffort: "medium",
        }));
      } else {
        // If same model, just update the model-specific settings
        setState((prev) => ({
          ...prev,
          selectedModel: modelId,
          currentConversationModel: prev.currentConversationModel || modelId, // Set if not set
          // Reset model-specific settings when switching models
          extendedThinking: false,
          webSearch: false,
          thinkingMode: false,
          reasoningEffort: "medium",
        }));
      }
    },
    [state.selectedModel]
  );

  // Toggle extended thinking
  const toggleExtendedThinking = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      extendedThinking: enabled,
    }));
  }, []);

  // Toggle web search (Claude & OpenAI)
  const toggleWebSearch = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      webSearch: enabled,
    }));
  }, []);

  // Toggle thinking mode (Gemini)
  const toggleThinkingMode = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      thinkingMode: enabled,
    }));
  }, []);

  // Set reasoning effort
  const setReasoningEffort = useCallback((effort: ReasoningEffort) => {
    setState((prev) => ({
      ...prev,
      reasoningEffort: effort,
    }));
  }, []);

  // Add a system message
  const addSystemMessage = useCallback(
    (content: string) => {
      const systemMessage = chatService.current.createMessage(
        "system",
        content
      );
      setState((prev) => ({
        ...prev,
        messages: [systemMessage, ...prev.messages].slice(-maxMessages),
      }));
    },
    [maxMessages]
  );

  // Remove a message
  const removeMessage = useCallback((messageId: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== messageId),
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Regenerate last response
  const regenerateResponse = useCallback(async () => {
    const userMessages = state.messages.filter((msg) => msg.role === "user");
    if (userMessages.length === 0) return;

    const lastUserMessage = userMessages[userMessages.length - 1];

    // Remove the last assistant message if it exists
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter(
        (msg) =>
          !(
            msg.role === "assistant" &&
            prev.messages.indexOf(msg) === prev.messages.length - 1
          )
      ),
    }));

    // Resend the last user message
    await sendMessage(lastUserMessage.content);
  }, [state.messages, sendMessage]);

  // Set messages directly (for loading conversations)
  const setMessages = useCallback(
    (messages: ChatMessage[]) => {
      setState((prev) => ({
        ...prev,
        messages: messages.slice(-maxMessages),
        error: null,
        streamingContent: "",
      }));
    },
    [maxMessages]
  );

  // Start new conversation
  const startNewConversation = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }

    setState((prev) => ({
      ...prev,
      messages: [],
      isLoading: false,
      isStreaming: false,
      isProcessingFiles: false,
      fileProcessingProgress: {},
      currentConversationId: null,
      currentConversationModel: null, // Reset conversation model
      error: null,
      streamingContent: "",
      systemInstruction: "", // Clear system instruction on new conversation
    }));
  }, []);

  // Set conversation ID (for loading existing conversations)
  const setConversationId = useCallback((conversationId: string | null) => {
    setState((prev) => ({
      ...prev,
      currentConversationId: conversationId,
    }));
  }, []);

  // Set system instruction
  const setSystemInstruction = useCallback((instruction: string) => {
    setState((prev) => ({
      ...prev,
      systemInstruction: instruction,
    }));
  }, []);

  // Set model for an existing conversation without clearing messages
  // This is specifically for loading existing conversations
  const setConversationModel = useCallback((modelId: string) => {
    setState((prev) => ({
      ...prev,
      selectedModel: modelId,
      currentConversationModel: modelId,
      // Reset model-specific settings when switching models
      extendedThinking: false,
      thinkingMode: false,
      reasoningEffort: "medium",
    }));
  }, []);

  return {
    // State
    messages: state.messages,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    isProcessingFiles: state.isProcessingFiles,
    fileProcessingProgress: state.fileProcessingProgress,
    streamingContent: state.streamingContent,
    error: state.error,
    selectedModel: state.selectedModel,
    availableModels: state.availableModels,
    extendedThinking: state.extendedThinking,
    webSearch: state.webSearch,
    thinkingMode: state.thinkingMode,
    reasoningEffort: state.reasoningEffort,
    currentConversationId: state.currentConversationId,
    currentConversationModel: state.currentConversationModel,
    systemInstruction: state.systemInstruction,

    // Actions
    sendMessage,
    stopStreaming,
    changeModel,
    addSystemMessage,
    removeMessage,
    clearError,
    regenerateResponse,
    loadModels,
    setMessages,
    startNewConversation,
    setConversationId,
    toggleExtendedThinking,
    toggleWebSearch,
    toggleThinkingMode,
    setReasoningEffort,
    setSystemInstruction,
    setConversationModel,

    // Computed
    hasMessages: state.messages.length > 0,
    canSend: !state.isLoading && !state.isStreaming,
    currentModel: state.availableModels.find(
      (m) => m.id === state.selectedModel
    ),
    isClaudeModel:
      state.availableModels.find(m => m.id === state.selectedModel)?.capabilities?.includes("extended-thinking") || false,
    isGeminiModel: state.selectedModel.includes("gemini"),
    isOpenAIModel: state.selectedModel.startsWith("gpt-") ||
                    state.availableModels.find(m => m.id === state.selectedModel)?.provider === "openai",
  };
}
