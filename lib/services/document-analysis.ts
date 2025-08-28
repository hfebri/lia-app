import { getAIService, createMessage } from "@/lib/ai/service";
import { db } from "@/db/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  extractTextFromFile,
  getTextStatistics,
  extractKeyPhrases,
} from "@/lib/utils/text-extraction";

export interface DocumentAnalysisResult {
  success: boolean;
  analysis?: {
    summary: string;
    keyPoints: string[];
    insights: string[];
    sentiment?: "positive" | "neutral" | "negative";
    topics: string[];
    statistics: {
      wordCount: number;
      charCount: number;
      readingTime: number; // in minutes
    };
  };
  error?: string;
}

export interface AnalysisOptions {
  model?: string;
  includeKeyPoints?: boolean;
  includeInsights?: boolean;
  includeSentiment?: boolean;
  includeTopics?: boolean;
  maxSummaryLength?: number;
}

/**
 * Analyze document content using AI
 */
export async function analyzeDocument(
  fileId: string,
  options: AnalysisOptions = {}
): Promise<DocumentAnalysisResult> {
  try {
    // Get file from database
    const file = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!file) {
      return {
        success: false,
        error: "File not found",
      };
    }

    // Check if text extraction is available
    if (!file.extractedText) {
      return {
        success: false,
        error: "No text content available for analysis",
      };
    }

    const {
      model = "openai/gpt-5",
      includeKeyPoints = true,
      includeInsights = true,
      includeSentiment = true,
      includeTopics = true,
      maxSummaryLength = 200,
    } = options;

    // Get text statistics
    const stats = getTextStatistics(file.extractedText);
    const readingTime = Math.ceil(stats.wordCount / 200); // Average reading speed

    // Extract basic key phrases
    const keyPhrases = extractKeyPhrases(file.extractedText, 10);

    // Prepare AI analysis prompt
    const analysisPrompt = createAnalysisPrompt(file.extractedText, {
      includeKeyPoints,
      includeInsights,
      includeSentiment,
      includeTopics,
      maxSummaryLength,
      filename: file.originalName,
    });

    // Get AI service and analyze
    console.log('📄 DEBUG: About to analyze document with AI', { fileId, filename: file.originalName, model });
    debugger; // DEBUG: About to call AI service for document analysis
    const aiService = getAIService();
    const response = await aiService.generateResponse(
      [
        createMessage(
          "system",
          "You are a document analysis expert. Provide structured, insightful analysis of documents."
        ),
        createMessage("user", analysisPrompt),
      ],
      {
        model,
        temperature: 0.3,
        max_tokens: 1500,
      }
    );

    // Parse AI response
    const analysis = parseAnalysisResponse(response.content);

    // Update file with analysis results
    await db
      .update(files)
      .set({
        analysisStatus: "completed",
        metadata: {
          ...file.metadata,
          analysis: {
            ...analysis,
            statistics: {
              wordCount: stats.wordCount,
              charCount: stats.charCount,
              readingTime,
            },
            keyPhrases,
            analyzedAt: new Date().toISOString(),
            model,
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(files.id, fileId));

    return {
      success: true,
      analysis: {
        ...analysis,
        statistics: {
          wordCount: stats.wordCount,
          charCount: stats.charCount,
          readingTime,
        },
      },
    };
  } catch (error) {
    console.error("Document analysis error:", error);

    // Update file status to error
    try {
      await db
        .update(files)
        .set({
          analysisStatus: "error",
          updatedAt: new Date(),
        })
        .where(eq(files.id, fileId));
    } catch (updateError) {
      console.error("Failed to update file status:", updateError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}

/**
 * Create analysis prompt for AI
 */
function createAnalysisPrompt(
  text: string,
  options: {
    includeKeyPoints: boolean;
    includeInsights: boolean;
    includeSentiment: boolean;
    includeTopics: boolean;
    maxSummaryLength: number;
    filename: string;
  }
): string {
  const {
    includeKeyPoints,
    includeInsights,
    includeSentiment,
    includeTopics,
    maxSummaryLength,
    filename,
  } = options;

  let prompt = `Please analyze the following document content from "${filename}":

${text.substring(0, 8000)} ${text.length > 8000 ? "..." : ""}

Please provide a structured analysis in the following JSON format:

{
  "summary": "A concise summary of the document (max ${maxSummaryLength} words)",`;

  if (includeKeyPoints) {
    prompt += `
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],`;
  }

  if (includeInsights) {
    prompt += `
  "insights": ["Insight 1", "Insight 2", "Insight 3"],`;
  }

  if (includeSentiment) {
    prompt += `
  "sentiment": "positive|neutral|negative",`;
  }

  if (includeTopics) {
    prompt += `
  "topics": ["Topic 1", "Topic 2", "Topic 3"]`;
  }

  prompt += `
}

Ensure the response is valid JSON and provides meaningful, actionable insights about the document content.`;

  return prompt;
}

/**
 * Parse AI analysis response
 */
function parseAnalysisResponse(response: string): {
  summary: string;
  keyPoints: string[];
  insights: string[];
  sentiment?: "positive" | "neutral" | "negative";
  topics: string[];
} {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "No summary available",
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        sentiment: parsed.sentiment || "neutral",
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      };
    }
  } catch (parseError) {
    console.error("Failed to parse AI response:", parseError);
  }

  // Fallback: extract information from plain text response
  return {
    summary: response.substring(0, 300) + "...",
    keyPoints: [],
    insights: [],
    sentiment: "neutral" as const,
    topics: [],
  };
}

/**
 * Analyze multiple files in batch
 */
export async function analyzeDocuments(
  fileIds: string[],
  options: AnalysisOptions = {}
): Promise<Array<{ fileId: string; result: DocumentAnalysisResult }>> {
  const results: Array<{ fileId: string; result: DocumentAnalysisResult }> = [];

  for (const fileId of fileIds) {
    try {
      const result = await analyzeDocument(fileId, options);
      results.push({ fileId, result });

      // Add delay between requests to avoid rate limiting
      if (fileIds.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      results.push({
        fileId,
        result: {
          success: false,
          error: error instanceof Error ? error.message : "Analysis failed",
        },
      });
    }
  }

  return results;
}

/**
 * Get analysis summary for a file
 */
export async function getFileAnalysis(fileId: string) {
  try {
    const file = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!file) {
      return null;
    }

    return {
      id: file.id,
      filename: file.originalName,
      analysisStatus: file.analysisStatus,
      analysis: file.metadata?.analysis || null,
      extractedText: file.extractedText,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  } catch (error) {
    console.error("Error getting file analysis:", error);
    return null;
  }
}
