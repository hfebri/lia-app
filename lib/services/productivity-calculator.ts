/**
 * Productivity Calculator Service
 *
 * Calculates productivity scores from raw activity data.
 * All scores are normalized to 0-100 scale.
 *
 * Score Components:
 * - Activity Score (25%): Volume and frequency
 * - Engagement Score (25%): Quality and depth
 * - Efficiency Score (25%): Speed and patterns
 * - Value Score (25%): Outcomes and impact
 */

export interface RawActivityData {
  totalConversations: number;
  totalMessages: number;
  totalUserMessages: number;
  totalAiMessages: number;
  totalFilesProcessed: number;
  activeDays: number;
  totalSessions: number;
  conversationLengths: number[]; // messages per conversation
  iterationDepths: number[]; // back-and-forth exchanges per conversation
  messageLengths: number[]; // character count per message
  fileUsageByConversation: number[]; // files per conversation
  timeToFirstMessage: number[]; // seconds array
  timeBetweenMessages: number[]; // seconds array
  sessionDurations: number[]; // seconds array
  activityByHour: { [hour: string]: number };
  activityByDayOfWeek: { [day: string]: number };
  tokenUsage: number[];
  conversationsWithMultipleExchanges: number; // conversations with >3 exchanges
  favoriteConversations: number;
  topics: { [topic: string]: number };
  models: { [model: string]: number };
}

interface CalculatedMetrics {
  // Activity metrics
  totalConversations: number;
  totalMessages: number;
  totalUserMessages: number;
  totalAiMessages: number;
  totalFilesProcessed: number;
  activeDays: number;
  totalSessions: number;

  // Engagement quality
  avgConversationLength: number;
  avgIterationDepth: number;
  complexityScore: number;
  conversationDiversity: number;

  // Efficiency
  avgTimeToFirstMessage: number;
  avgTimeBetweenMessages: number;
  avgSessionDuration: number;
  peakActivityHour: number;

  // Value creation
  tokenEfficiency: number;
  avgMessagesPerConversation: number;
  fileProcessingRate: number;
  conversationCompletionRate: number;
  favoriteConversations: number;

  // Composite scores
  activityScore: number;
  engagementScore: number;
  efficiencyScore: number;
  valueScore: number;
  productivityScore: number;

  // Breakdowns
  activityByDayOfWeek: { [key: string]: number };
  activityByHour: { [key: string]: number };
  topicBreakdown: { [key: string]: number };
  modelUsage: { [key: string]: number };
}

export class ProductivityCalculator {
  /**
   * Calculate all productivity metrics from raw activity data
   */
  static calculateMetrics(data: RawActivityData): CalculatedMetrics {
    // === CALCULATE BASE METRICS ===
    const avgConversationLength =
      data.totalConversations > 0
        ? data.totalMessages / data.totalConversations
        : 0;

    const avgIterationDepth =
      data.iterationDepths.length > 0
        ? this.average(data.iterationDepths)
        : 0;

    const avgTimeToFirstMessage =
      data.timeToFirstMessage.length > 0
        ? Math.round(this.average(data.timeToFirstMessage))
        : 0;

    const avgTimeBetweenMessages =
      data.timeBetweenMessages.length > 0
        ? Math.round(this.average(data.timeBetweenMessages))
        : 0;

    const avgSessionDuration =
      data.sessionDurations.length > 0
        ? Math.round(this.average(data.sessionDurations))
        : 0;

    const peakActivityHour = this.findPeakHour(data.activityByHour);

    const avgMessagesPerConversation = avgConversationLength;

    const fileProcessingRate =
      data.totalSessions > 0 ? data.totalFilesProcessed / data.totalSessions : 0;

    const conversationCompletionRate =
      data.totalConversations > 0
        ? (data.conversationsWithMultipleExchanges / data.totalConversations) *
          100
        : 0;

    // Token efficiency: higher is better (more output per token)
    const totalTokens = data.tokenUsage.reduce((sum, t) => sum + t, 0);
    const tokenEfficiency =
      totalTokens > 0 ? (data.totalMessages / totalTokens) * 1000 : 0; // normalized per 1k tokens

    // Complexity score based on message length and file usage
    const complexityScore = this.calculateComplexityScore(
      data.messageLengths,
      data.fileUsageByConversation
    );

    // Conversation diversity based on topic variety
    const conversationDiversity = this.calculateDiversity(data.topics);

    // === CALCULATE COMPONENT SCORES ===
    const activityScore = this.calculateActivityScore({
      totalConversations: data.totalConversations,
      totalMessages: data.totalMessages,
      totalFilesProcessed: data.totalFilesProcessed,
      activeDays: data.activeDays,
      totalSessions: data.totalSessions,
    });

    const engagementScore = this.calculateEngagementScore({
      avgConversationLength,
      avgIterationDepth,
      complexityScore,
      conversationDiversity,
    });

    const efficiencyScore = this.calculateEfficiencyScore({
      avgTimeToFirstMessage,
      avgTimeBetweenMessages,
      avgSessionDuration,
    });

    const valueScore = this.calculateValueScore({
      tokenEfficiency,
      conversationCompletionRate,
      fileProcessingRate,
      favoriteConversations: data.favoriteConversations,
      totalConversations: data.totalConversations,
    });

    // === CALCULATE COMPOSITE PRODUCTIVITY SCORE ===
    const productivityScore = this.calculateProductivityScore({
      activityScore,
      engagementScore,
      efficiencyScore,
      valueScore,
    });

    return {
      // Activity metrics
      totalConversations: data.totalConversations,
      totalMessages: data.totalMessages,
      totalUserMessages: data.totalUserMessages,
      totalAiMessages: data.totalAiMessages,
      totalFilesProcessed: data.totalFilesProcessed,
      activeDays: data.activeDays,
      totalSessions: data.totalSessions,

      // Engagement quality
      avgConversationLength,
      avgIterationDepth,
      complexityScore,
      conversationDiversity,

      // Efficiency
      avgTimeToFirstMessage,
      avgTimeBetweenMessages,
      avgSessionDuration,
      peakActivityHour,

      // Value creation
      tokenEfficiency,
      avgMessagesPerConversation,
      fileProcessingRate,
      conversationCompletionRate,
      favoriteConversations: data.favoriteConversations,

      // Composite scores
      activityScore,
      engagementScore,
      efficiencyScore,
      valueScore,
      productivityScore,

      // Breakdowns
      activityByDayOfWeek: data.activityByDayOfWeek,
      activityByHour: data.activityByHour,
      topicBreakdown: data.topics,
      modelUsage: data.models,
    };
  }

  /**
   * Calculate Activity Score (0-100)
   * Based on: conversations, messages, files, active days, sessions
   * Weight: 25% of total productivity score
   */
  private static calculateActivityScore(data: {
    totalConversations: number;
    totalMessages: number;
    totalFilesProcessed: number;
    activeDays: number;
    totalSessions: number;
  }): number {
    // Normalize each metric to 0-100 scale based on reasonable benchmarks
    const conversationScore = Math.min(
      (data.totalConversations / 20) * 100,
      100
    ); // 20 conversations = 100
    const messageScore = Math.min((data.totalMessages / 100) * 100, 100); // 100 messages = 100
    const fileScore = Math.min((data.totalFilesProcessed / 10) * 100, 100); // 10 files = 100
    const activeDayScore = Math.min((data.activeDays / 7) * 100, 100); // 7 days = 100
    const sessionScore = Math.min((data.totalSessions / 15) * 100, 100); // 15 sessions = 100

    // Weighted average
    return (
      conversationScore * 0.3 +
      messageScore * 0.3 +
      fileScore * 0.15 +
      activeDayScore * 0.15 +
      sessionScore * 0.1
    );
  }

  /**
   * Calculate Engagement Score (0-100)
   * Based on: conversation length, iteration depth, complexity, diversity
   * Weight: 25% of total productivity score
   */
  private static calculateEngagementScore(data: {
    avgConversationLength: number;
    avgIterationDepth: number;
    complexityScore: number;
    conversationDiversity: number;
  }): number {
    // Normalize conversation length (5 messages = 100)
    const lengthScore = Math.min((data.avgConversationLength / 5) * 100, 100);

    // Normalize iteration depth (3 iterations = 100)
    const depthScore = Math.min((data.avgIterationDepth / 3) * 100, 100);

    // Complexity and diversity are already 0-100

    return (
      lengthScore * 0.3 +
      depthScore * 0.3 +
      data.complexityScore * 0.2 +
      data.conversationDiversity * 0.2
    );
  }

  /**
   * Calculate Efficiency Score (0-100)
   * Based on: time metrics, session patterns
   * Weight: 25% of total productivity score
   */
  private static calculateEfficiencyScore(data: {
    avgTimeToFirstMessage: number;
    avgTimeBetweenMessages: number;
    avgSessionDuration: number;
  }): number {
    // Quick start time is better (30s = 100, 5min = 0)
    const startTimeScore = Math.max(
      100 - (data.avgTimeToFirstMessage / 300) * 100,
      0
    );

    // Quick response time is better (1min = 100, 10min = 0)
    const responseTimeScore = Math.max(
      100 - (data.avgTimeBetweenMessages / 600) * 100,
      0
    );

    // Optimal session duration: 15-30 minutes = 100
    let sessionScore = 0;
    const sessionMinutes = data.avgSessionDuration / 60;
    if (sessionMinutes >= 15 && sessionMinutes <= 30) {
      sessionScore = 100;
    } else if (sessionMinutes < 15) {
      sessionScore = (sessionMinutes / 15) * 100;
    } else {
      sessionScore = Math.max(100 - ((sessionMinutes - 30) / 30) * 50, 0);
    }

    return (
      startTimeScore * 0.3 + responseTimeScore * 0.4 + sessionScore * 0.3
    );
  }

  /**
   * Calculate Value Score (0-100)
   * Based on: token efficiency, completion rate, file usage, favorites
   * Weight: 25% of total productivity score
   */
  private static calculateValueScore(data: {
    tokenEfficiency: number;
    conversationCompletionRate: number;
    fileProcessingRate: number;
    favoriteConversations: number;
    totalConversations: number;
  }): number {
    // Token efficiency (10 messages per 1k tokens = 100)
    const tokenScore = Math.min((data.tokenEfficiency / 10) * 100, 100);

    // Completion rate is already 0-100

    // File processing rate (1 file per session = 100)
    const fileScore = Math.min(data.fileProcessingRate * 100, 100);

    // Favorite rate (20% favorited = 100)
    const favoriteRate =
      data.totalConversations > 0
        ? (data.favoriteConversations / data.totalConversations) * 100
        : 0;
    const favoriteScore = Math.min((favoriteRate / 20) * 100, 100);

    return (
      tokenScore * 0.3 +
      data.conversationCompletionRate * 0.3 +
      fileScore * 0.2 +
      favoriteScore * 0.2
    );
  }

  /**
   * Calculate composite Productivity Score (0-100)
   * Equal weighting: 25% each component
   */
  private static calculateProductivityScore(data: {
    activityScore: number;
    engagementScore: number;
    efficiencyScore: number;
    valueScore: number;
  }): number {
    return (
      data.activityScore * 0.25 +
      data.engagementScore * 0.25 +
      data.efficiencyScore * 0.25 +
      data.valueScore * 0.25
    );
  }

  /**
   * Calculate complexity score from message lengths and file usage
   */
  private static calculateComplexityScore(
    messageLengths: number[],
    fileUsageByConversation: number[]
  ): number {
    if (messageLengths.length === 0) return 0;

    // Longer messages indicate more complex interactions
    const avgLength = this.average(messageLengths);
    const lengthScore = Math.min((avgLength / 500) * 100, 100); // 500 chars = 100

    // More files indicate more complex work
    const avgFiles =
      fileUsageByConversation.length > 0
        ? this.average(fileUsageByConversation)
        : 0;
    const fileScore = Math.min((avgFiles / 3) * 100, 100); // 3 files = 100

    return lengthScore * 0.6 + fileScore * 0.4;
  }

  /**
   * Calculate diversity score from topic distribution
   * Higher entropy = more diverse = better
   */
  private static calculateDiversity(topics: { [key: string]: number }): number {
    const values = Object.values(topics);
    if (values.length === 0) return 0;

    const total = values.reduce((sum, v) => sum + v, 0);
    if (total === 0) return 0;

    // Calculate Shannon entropy
    let entropy = 0;
    for (const count of values) {
      const p = count / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    // Normalize to 0-100 (max entropy for 10 topics ≈ 3.32)
    const maxEntropy = Math.log2(Math.min(values.length, 10));
    return maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;
  }

  /**
   * Find the hour with peak activity
   */
  private static findPeakHour(activityByHour: {
    [hour: string]: number;
  }): number {
    let maxHour = 0;
    let maxCount = 0;

    for (const [hour, count] of Object.entries(activityByHour)) {
      if (count > maxCount) {
        maxCount = count;
        maxHour = parseInt(hour);
      }
    }

    return maxHour;
  }

  /**
   * Calculate average of an array
   */
  private static average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate daily score from snapshot data
   */
  static calculateDailyScore(data: {
    messagesCreated: number;
    conversationsCreated: number;
    filesProcessed: number;
    activeSessions: number;
    totalActiveTime: number; // seconds
  }): {
    dailyActivityScore: number;
    dailyEngagementScore: number;
    dailyEfficiencyScore: number;
    dailyValueScore: number;
    dailyProductivityScore: number;
  } {
    // Daily activity score (0-100)
    const dailyActivityScore =
      Math.min((data.conversationsCreated / 5) * 100, 100) * 0.4 +
      Math.min((data.messagesCreated / 20) * 100, 100) * 0.4 +
      Math.min((data.filesProcessed / 3) * 100, 100) * 0.2;

    // Daily engagement score (based on session depth)
    const avgMessagesPerSession =
      data.activeSessions > 0 ? data.messagesCreated / data.activeSessions : 0;
    const dailyEngagementScore = Math.min(
      (avgMessagesPerSession / 5) * 100,
      100
    );

    // Daily efficiency score (based on active time)
    const activeMinutes = data.totalActiveTime / 60;
    let dailyEfficiencyScore = 0;
    if (activeMinutes >= 30 && activeMinutes <= 120) {
      dailyEfficiencyScore = 100;
    } else if (activeMinutes < 30) {
      dailyEfficiencyScore = (activeMinutes / 30) * 100;
    } else {
      dailyEfficiencyScore = Math.max(
        100 - ((activeMinutes - 120) / 120) * 50,
        0
      );
    }

    // Daily value score (based on conversations with files)
    const fileUsageRate =
      data.conversationsCreated > 0
        ? (data.filesProcessed / data.conversationsCreated) * 100
        : 0;
    const dailyValueScore = Math.min(fileUsageRate, 100);

    // Composite daily productivity score
    const dailyProductivityScore =
      dailyActivityScore * 0.3 +
      dailyEngagementScore * 0.25 +
      dailyEfficiencyScore * 0.25 +
      dailyValueScore * 0.2;

    return {
      dailyActivityScore,
      dailyEngagementScore,
      dailyEfficiencyScore,
      dailyValueScore,
      dailyProductivityScore,
    };
  }
}
