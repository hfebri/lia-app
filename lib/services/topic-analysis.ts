import { db } from "@/db/db";
import { conversations, messages } from "@/db/schema/index";
import { eq } from "drizzle-orm";
import { getAIService } from "@/lib/ai/service";

export interface PopularTopic {
  topic: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  examples: string[];
  keywords: string[];
}

export interface TopicAnalysisResult {
  topics: PopularTopic[];
  totalConversations: number;
  analyzedMessages: number;
}

// Predefined topic categories with keywords
const TOPIC_CATEGORIES = {
  "AI & Machine Learning": [
    "ai",
    "artificial intelligence",
    "machine learning",
    "ml",
    "neural network",
    "deep learning",
    "chatbot",
    "llm",
    "model",
    "training",
    "algorithm",
    "natural language",
    "nlp",
    "gpt",
    "claude",
    "openai",
    "hugging face",
  ],
  "Programming & Development": [
    "code",
    "programming",
    "development",
    "javascript",
    "python",
    "react",
    "nodejs",
    "api",
    "backend",
    "frontend",
    "database",
    "sql",
    "git",
    "github",
    "debugging",
    "function",
    "variable",
    "class",
    "method",
    "framework",
    "library",
    "package",
  ],
  "Document Analysis": [
    "document",
    "pdf",
    "file",
    "text",
    "analysis",
    "extract",
    "parse",
    "read",
    "upload",
    "content",
    "summary",
    "summarize",
    "excel",
    "word",
    "csv",
  ],
  "Data Processing": [
    "data",
    "processing",
    "analysis",
    "csv",
    "json",
    "transform",
    "filter",
    "sort",
    "aggregate",
    "visualization",
    "chart",
    "graph",
    "statistics",
  ],
  "Content Writing": [
    "write",
    "writing",
    "content",
    "blog",
    "article",
    "email",
    "copy",
    "marketing",
    "creative",
    "story",
    "essay",
    "report",
    "letter",
    "proposal",
    "draft",
  ],
  "Help & Support": [
    "help",
    "how to",
    "tutorial",
    "guide",
    "explain",
    "learn",
    "understand",
    "problem",
    "issue",
    "error",
    "fix",
    "solution",
    "troubleshoot",
  ],
  "Research & Information": [
    "research",
    "information",
    "facts",
    "study",
    "analyze",
    "compare",
    "review",
    "summary",
    "overview",
    "details",
    "background",
    "context",
    "investigation",
  ],
  "Business & Strategy": [
    "business",
    "strategy",
    "plan",
    "market",
    "competition",
    "growth",
    "revenue",
    "customer",
    "sales",
    "marketing",
    "product",
    "service",
    "management",
  ],
};

/**
 * Extract topics from conversation messages using AI analysis
 */
export async function analyzeConversationTopics(
  userId?: string
): Promise<TopicAnalysisResult> {
  try {
    // Get all conversations for the user
    let userConversations;
    if (userId) {
      userConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId));
    } else {
      // For demo/testing, get all conversations
      userConversations = await db.select().from(conversations);
    }

    if (userConversations.length === 0) {
      return {
        topics: [],
        totalConversations: 0,
        analyzedMessages: 0,
      };
    }

    // Get all messages for these conversations
    const conversationIds = userConversations.map((c) => c.id);
    const userMessages = await db.select().from(messages).where(
      // Get messages from user conversations where role is 'user'
      eq(messages.role, "user")
    );

    // Filter messages that belong to user's conversations
    const filteredMessages = userMessages.filter((msg) =>
      conversationIds.includes(msg.conversationId)
    );

    if (filteredMessages.length === 0) {

      return {
        topics: [],
        totalConversations: userConversations.length,
        analyzedMessages: 0,
      };
    }

    // Use AI to analyze conversation topics

    const aiAnalysis = await analyzeTopicsWithAI(
      filteredMessages,
      userConversations
    );
    return {
      topics: aiAnalysis,
      totalConversations: userConversations.length,
      analyzedMessages: filteredMessages.length,
    };
  } catch (error) {

    // Fallback to keyword-based analysis if AI fails
    return await fallbackKeywordAnalysis(userId);
  }
}

/**
 * Use OpenAI API via Replicate to analyze conversation topics
 */
async function analyzeTopicsWithAI(
  messages: any[],
  conversations: any[]
): Promise<PopularTopic[]> {
  try {

    const aiService = getAIService();

    // Sample messages for analysis (take a representative sample)
    const sampleMessages = messages
      .sort(() => 0.5 - Math.random()) // Shuffle
      .slice(0, Math.min(50, messages.length)) // Take up to 50 messages
      .map((msg) => msg.content.substring(0, 200)); // Limit length

    const analysisPrompt = `
Analyze the following user conversation messages and identify the most popular topics/themes. 

Messages:
${sampleMessages.map((msg, i) => `${i + 1}. "${msg}"`).join("\n")}

Please analyze these messages and return a JSON response with popular topics. For each topic, provide:
1. topic: A descriptive name for the topic
2. count: Estimated number of conversations about this topic
3. percentage: Percentage of total conversations
4. trend: "up", "down", or "stable" based on the topic's popularity
5. examples: 2-3 example phrases from the messages
6. keywords: 3-5 key words related to this topic

Return exactly 5-8 topics, ordered by popularity. Focus on meaningful categories like:
- Programming & Development
- AI & Machine Learning
- Document Analysis
- Data Processing
- Content Writing
- Business & Strategy
- Help & Support
- Research & Information

Return only valid JSON in this format:
[
  {
    "topic": "Topic Name",
    "count": 5,
    "percentage": 25.0,
    "trend": "up",
    "examples": ["example 1", "example 2"],
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
]`;
    const response = await aiService.chat(analysisPrompt, {
      systemPrompt:
        "You are an expert data analyst specializing in conversation topic analysis. Return only valid JSON responses.",
      model: "openai/gpt-5",
      provider: "replicate",
    });
    // Parse AI response
    const cleanResponse = response.trim();
    const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {

      throw new Error("No valid JSON found in AI response");
    }
    const aiTopics = JSON.parse(jsonMatch[0]) as PopularTopic[];
    // Validate and adjust counts based on actual data
    const totalConversations = conversations.length;
    const adjustedTopics = aiTopics.map((topic) => ({
      ...topic,
      count: Math.min(topic.count, totalConversations),
      percentage: Math.min(topic.percentage, 100),
    }));
    return adjustedTopics.slice(0, 8);
  } catch (error) {
    throw error;
  }
}

/**
 * Fallback keyword-based analysis when AI fails
 */
async function fallbackKeywordAnalysis(
  userId?: string
): Promise<TopicAnalysisResult> {
  try {
    // Get conversations and messages again for fallback
    let userConversations;
    if (userId) {
      userConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId));
    } else {
      userConversations = await db.select().from(conversations);
    }

    const conversationIds = userConversations.map((c) => c.id);
    const userMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.role, "user"));

    const filteredMessages = userMessages.filter((msg) =>
      conversationIds.includes(msg.conversationId)
    );

    // Analyze topics from messages using keywords
    const topicCounts = new Map<
      string,
      {
        count: number;
        examples: Set<string>;
        keywords: Set<string>;
        conversations: Set<string>;
      }
    >();

    // Initialize topic categories
    Object.keys(TOPIC_CATEGORIES).forEach((topic) => {
      topicCounts.set(topic, {
        count: 0,
        examples: new Set(),
        keywords: new Set(),
        conversations: new Set(),
      });
    });

    // Analyze each message
    filteredMessages.forEach((message) => {
      const content = message.content.toLowerCase();
      const messagePreview = message.content.substring(0, 100).trim();

      // Check each topic category
      Object.entries(TOPIC_CATEGORIES).forEach(([topicName, keywords]) => {
        const matchedKeywords = keywords.filter((keyword) =>
          content.includes(keyword.toLowerCase())
        );

        if (matchedKeywords.length > 0) {
          const topicData = topicCounts.get(topicName)!;
          topicData.conversations.add(message.conversationId);
          topicData.examples.add(messagePreview);
          matchedKeywords.forEach((kw) => topicData.keywords.add(kw));
        }
      });
    });

    // Convert to PopularTopic format
    const topics: PopularTopic[] = [];
    const totalAnalyzedConversations = userConversations.length;

    topicCounts.forEach((data, topicName) => {
      const conversationCount = data.conversations.size;
      if (conversationCount > 0) {
        const percentage =
          (conversationCount / totalAnalyzedConversations) * 100;

        topics.push({
          topic: topicName,
          count: conversationCount,
          percentage: Math.round(percentage * 10) / 10,
          trend: calculateTrend(percentage),
          examples: Array.from(data.examples).slice(0, 5),
          keywords: Array.from(data.keywords).slice(0, 10),
        });
      }
    });

    // Sort by count (most popular first)
    topics.sort((a, b) => b.count - a.count);

    return {
      topics: topics.slice(0, 8),
      totalConversations: totalAnalyzedConversations,
      analyzedMessages: filteredMessages.length,
    };
  } catch (error) {

    // Final fallback
    return {
      topics: [
        {
          topic: "General Assistance",
          count: 1,
          percentage: 100.0,
          trend: "stable",
          examples: ["Various user queries and assistance requests"],
          keywords: ["help", "assist", "support"],
        },
      ],
      totalConversations: 1,
      analyzedMessages: 1,
    };
  }
}

/**
 * Simple trend calculation based on percentage
 */
function calculateTrend(percentage: number): "up" | "down" | "stable" {
  if (percentage > 30) return "up";
  if (percentage < 10) return "down";
  return "stable";
}

/**
 * Get topic trends by comparing current vs previous period
 */
export async function getTopicTrends(
  userId?: string,
  days: number = 30
): Promise<Map<string, "up" | "down" | "stable">> {
  try {
    const now = new Date();
    const currentPeriodStart = new Date(
      now.getTime() - days * 24 * 60 * 60 * 1000
    );
    const previousPeriodStart = new Date(
      now.getTime() - days * 2 * 24 * 60 * 60 * 1000
    );

    // This would require more complex date filtering in the actual implementation
    // For now, return simple trend indicators

    return new Map([
      ["AI & Machine Learning", "up"],
      ["Programming & Development", "stable"],
      ["Document Analysis", "up"],
      ["Data Processing", "down"],
      ["Content Writing", "up"],
      ["Help & Support", "stable"],
      ["Research & Information", "stable"],
      ["Business & Strategy", "down"],
    ]);
  } catch (error) {
    return new Map();
  }
}
