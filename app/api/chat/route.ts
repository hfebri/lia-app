import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai/service";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import type { AIMessage, AIProviderName } from "@/lib/ai/types";
import { LIA_SYSTEM_INSTRUCTION } from "@/lib/constants/ai-models";

// Configure runtime and timeout for this route
export const runtime = 'nodejs'; // Use Node.js runtime (not Edge) for better timeout support
export const maxDuration = 300; // Max execution time: Hobby=10s, Pro=60s, Enterprise=300s
// NOTE: GPT-5 Pro can take 5+ minutes to respond due to extended reasoning

export async function POST(request: NextRequest) {
  try {
    // Require authentication for all chat requests and get user info
    const authenticatedUser = await requireAuthenticatedUser();
    let messages,
      model = "gpt-5",
      stream = false,
      extended_thinking = false,
      thinking_budget_tokens = 1024,
      max_image_resolution = 0.5,
      reasoning_effort: "minimal" | "low" | "medium" | "high" = "medium",
      enable_web_search = true,
      verbosity: "low" | "medium" | "high" = "medium",
      systemInstruction = "",
      files: Array<{
        name: string;
        type: string;
        size: number;
        data: string;
      }> = [];

    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle FormData for file uploads
      const formData = await request.formData();

      messages = JSON.parse((formData.get("messages") as string) || "[]");
      model = (formData.get("model") as string) || "gpt-5";
      stream = formData.get("stream") === "true";
      extended_thinking = formData.get("extended_thinking") === "true";
      thinking_budget_tokens =
        parseInt(formData.get("thinking_budget_tokens") as string) || 1024;
      max_image_resolution =
        parseFloat(formData.get("max_image_resolution") as string) || 0.5;
      enable_web_search = formData.get("enable_web_search") !== "false";
      verbosity = (formData.get("verbosity") as "low" | "medium" | "high") || "medium";
      systemInstruction = (formData.get("systemInstruction") as string) || "";

      // Extract files
      const fileEntries = Array.from(formData.entries()).filter(([key]) =>
        key.startsWith("file_")
      );
      files = await Promise.all(
        fileEntries.map(async ([, file]) => {
          const f = file as File;
          const buffer = await f.arrayBuffer();
          return {
            name: f.name,
            type: f.type,
            size: f.size,
            data: Buffer.from(buffer).toString("base64"),
          };
        })
      );
    } else {
      // Handle JSON for text-only messages or messages with base64 files
      const body = await request.json();
      ({
        messages,
        model,
        stream,
        extended_thinking,
        thinking_budget_tokens,
        max_image_resolution,
        reasoning_effort,
        enable_web_search,
        verbosity,
        systemInstruction,
      } = body);

      // Extract files from the LATEST USER MESSAGE ONLY (not from entire conversation history)
      if (messages && Array.isArray(messages)) {
        messages.forEach(
          (msg: { files?: unknown[]; [key: string]: unknown }) => {
            if (msg.files && Array.isArray(msg.files)) {
              files.push(
                ...(msg.files as Array<{
                  name: string;
                  type: string;
                  size: number;
                  data: string;
                }>)
              );
            }
          }
        );
      }
    }

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Validate file attachments (best-effort: process valid files, warn about invalid ones)
    const FILE_LIMITS = {
      maxFilesPerMessage: 10,
      maxTotalSize: 50 * 1024 * 1024, // 50MB
      maxIndividualSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        // Images (native vision support)
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/svg+xml",
        // PDFs
        "application/pdf", // Claude: native, OpenAI: OCR fallback
        // Text files
        "text/plain",
        "text/csv",
        "text/markdown",
        "text/rtf",
        "application/rtf",
        // Microsoft Office (via Marker OCR)
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
        "application/msword", // .doc
        "application/vnd.ms-excel", // .xls
        "application/vnd.ms-powerpoint", // .ppt
        "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
        // OpenDocument (via Marker OCR)
        "application/vnd.oasis.opendocument.text", // .odt
        "application/vnd.oasis.opendocument.spreadsheet", // .ods
        "application/vnd.oasis.opendocument.presentation", // .odp
      ],
    };

    const fileValidationWarnings: Array<{ fileName: string; reason: string }> = [];

    // Filter and validate files in each message
    messages = messages.map((msg: { files?: unknown[]; [key: string]: unknown }) => {
      if (!msg.files || !Array.isArray(msg.files)) {
        return msg;
      }

      const validFiles: any[] = [];
      const msgFiles = msg.files as Array<{
        name: string;
        type: string;
        size: number;
        data?: string;
        url?: string;
      }>;

      for (const file of msgFiles) {
        // Validate individual file size
        if (file.size > FILE_LIMITS.maxIndividualSize) {
          fileValidationWarnings.push({
            fileName: file.name,
            reason: `File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds limit of ${FILE_LIMITS.maxIndividualSize / (1024 * 1024)}MB`
          });
          continue;
        }

        // Validate file type
        if (!FILE_LIMITS.allowedMimeTypes.includes(file.type)) {
          fileValidationWarnings.push({
            fileName: file.name,
            reason: `File type "${file.type}" is not supported`
          });
          continue;
        }

        // File is valid, keep it
        validFiles.push(file);
      }

      return { ...msg, files: validFiles };
    });

    // Validate total file count across all messages
    const allValidFiles = messages.flatMap((msg: any) => msg.files || []);
    if (allValidFiles.length > FILE_LIMITS.maxFilesPerMessage) {
      // Keep only first N files, warn about the rest
      const excessCount = allValidFiles.length - FILE_LIMITS.maxFilesPerMessage;
      fileValidationWarnings.push({
        fileName: "general",
        reason: `${excessCount} file(s) exceeded the limit of ${FILE_LIMITS.maxFilesPerMessage} files per message and were skipped`
      });

      // Trim files to limit
      let filesRemaining = FILE_LIMITS.maxFilesPerMessage;
      messages = messages.map((msg: any) => {
        if (!msg.files || filesRemaining <= 0) {
          return { ...msg, files: [] };
        }
        const filesToKeep = msg.files.slice(0, filesRemaining);
        filesRemaining -= filesToKeep.length;
        return { ...msg, files: filesToKeep };
      });
    }

    // Validate total size
    const totalSize = messages.flatMap((msg: any) => msg.files || [])
      .reduce((sum: number, f: any) => sum + (f.size || 0), 0);

    if (totalSize > FILE_LIMITS.maxTotalSize) {
      // Calculate which files to keep within budget
      fileValidationWarnings.push({
        fileName: "general",
        reason: `Total size ${(totalSize / (1024 * 1024)).toFixed(1)}MB exceeds limit of ${FILE_LIMITS.maxTotalSize / (1024 * 1024)}MB. Some files were skipped.`
      });

      // Prioritize most recent files, trim to fit within size limit
      let sizeRemaining = FILE_LIMITS.maxTotalSize;
      messages = messages.map((msg: any, idx: number) => {
        if (!msg.files || sizeRemaining <= 0) {
          return { ...msg, files: [] };
        }
        const keptFiles = [];
        for (const file of msg.files) {
          if (sizeRemaining >= file.size) {
            keptFiles.push(file);
            sizeRemaining -= file.size;
          } else {
            fileValidationWarnings.push({
              fileName: file.name,
              reason: `Skipped due to total size limit (${FILE_LIMITS.maxTotalSize / (1024 * 1024)}MB)`
            });
          }
        }
        return { ...msg, files: keptFiles };
      });
    }

    // Initialize AI service
    const aiService = new AIService();

    // Determine provider based on model
    let provider: AIProviderName = "openai"; // Default to OpenAI
    if (model.startsWith("claude-") || model.includes("claude")) {
      // Claude models use direct Anthropic provider
      provider = "anthropic";
    } else if (model.startsWith("anthropic/") || model.startsWith("deepseek-ai/")) {
      // Anthropic and DeepSeek models are served through Replicate
      provider = "replicate";
    } else if (model.startsWith("gpt-")) {
      // GPT models use direct OpenAI provider
      provider = "openai";
    }

    // Convert messages to AI format - preserve files in messages
    const aiMessages: AIMessage[] = messages.map(
      (msg: {
        role: string;
        content: string;
        files?: Array<{
          name: string;
          type: string;
          size?: number;
          data?: string;
          url?: string;
        }>;
        [key: string]: unknown;
      }) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        files: msg.files, // Preserve files from message
      })
    );

    if (stream) {
      // Create streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Combine default LIA system instruction with user's custom instruction
            let combinedSystemPrompt = LIA_SYSTEM_INSTRUCTION;

            // Add user's professional role to system instruction if available
            if (authenticatedUser.user.professionalRole) {
              combinedSystemPrompt += `\n\nUSER CONTEXT:\n- Professional Role: ${authenticatedUser.user.professionalRole}\n- Tailor your responses to be relevant for someone in this role`;
            }

            if (systemInstruction && systemInstruction.trim()) {
              combinedSystemPrompt = `${combinedSystemPrompt}\n\nAdditional Instructions: ${systemInstruction.trim()}`;
            }

            const stream = aiService.generateStream(aiMessages, {
              model,
              provider,
              temperature: 0.7,
              max_tokens: 8192,
              system_prompt: combinedSystemPrompt,
              extended_thinking,
              thinking_budget_tokens,
              max_image_resolution,
              reasoning_effort,
              enable_web_search,
              verbosity,
            });

            let isFirstChunk = true;
            for await (const chunk of stream) {
              const data = JSON.stringify({
                content: chunk.content,
                isComplete: chunk.isComplete,
                usage: chunk.usage,
                // Include file validation warnings in first chunk
                ...(isFirstChunk && fileValidationWarnings.length > 0 ? {
                  fileValidationWarnings
                } : {}),
              });

              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              isFirstChunk = false;

              if (chunk.isComplete) {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                break;
              }
            }
          } catch (error) {
            // Send error as a complete message with typing animation
            const errorMessage =
              error instanceof Error ? error.message : "Streaming failed";
            const errorData = JSON.stringify({
              content: `Error: ${errorMessage}`,
              isComplete: true,
              error: true,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    } else {
      // Generate non-streaming response
      // Combine default LIA system instruction with user's custom instruction
      let combinedSystemPrompt = LIA_SYSTEM_INSTRUCTION;

      // Add user's professional role to system instruction if available
      if (authenticatedUser.user.professionalRole) {
        combinedSystemPrompt += `\n\nUSER CONTEXT:\n- Professional Role: ${authenticatedUser.user.professionalRole}\n- Tailor your responses to be relevant for someone in this role`;
      }

      if (systemInstruction && systemInstruction.trim()) {
        combinedSystemPrompt = `${combinedSystemPrompt}\n\nAdditional Instructions: ${systemInstruction.trim()}`;
      }

      const response = await aiService.generateResponse(aiMessages, {
        model,
        provider,
        temperature: 0.7,
        max_tokens: 8192,
        system_prompt: combinedSystemPrompt,
        extended_thinking,
        thinking_budget_tokens,
        max_image_resolution,
        reasoning_effort,
        enable_web_search,
        verbosity,
      });

      return NextResponse.json({
        success: true,
        data: {
          content: response.content,
          model: response.model,
          provider: response.provider,
          usage: response.usage,
        },
        // Include file validation warnings if any files were skipped
        ...(fileValidationWarnings.length > 0 ? {
          fileValidationWarnings
        } : {}),
      });
    }
  } catch (error) {
    console.error("[API /api/chat] Failed to process request:", error);

    // Extract user-friendly error message
    let userMessage = "An error occurred while processing your request. Please try again.";
    let statusCode = 500;

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();

      // Token limit errors
      if (errorMsg.includes("prompt is too long") || errorMsg.includes("tokens >") || errorMsg.includes("maximum")) {
        userMessage = "Your message is too long. Please try reducing the amount of text or number of files attached.";
        statusCode = 400;
      }
      // Rate limit errors
      else if (errorMsg.includes("rate limit") || errorMsg.includes("too many requests")) {
        userMessage = "You're sending messages too quickly. Please wait a moment and try again.";
        statusCode = 429;
      }
      // Authentication errors
      else if (errorMsg.includes("authentication") || errorMsg.includes("unauthorized") || errorMsg.includes("api key")) {
        userMessage = "There was an authentication issue. Please refresh the page and try again.";
        statusCode = 401;
      }
      // Timeout errors
      else if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
        userMessage = "The request took too long to process. Please try again with a shorter message.";
        statusCode = 504;
      }
      // Content policy errors
      else if (errorMsg.includes("content policy") || errorMsg.includes("safety")) {
        userMessage = "Your message was flagged by content safety policies. Please rephrase and try again.";
        statusCode = 400;
      }
      // File/image errors
      else if (errorMsg.includes("image") || errorMsg.includes("file")) {
        userMessage = "There was an issue processing one of your files. Please try with different files.";
        statusCode = 400;
      }
      // Network errors
      else if (errorMsg.includes("network") || errorMsg.includes("connection")) {
        userMessage = "Network connection issue. Please check your internet and try again.";
        statusCode = 503;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage,
      },
      { status: statusCode }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
