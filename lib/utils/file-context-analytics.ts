/**
 * File Context Analytics
 *
 * Tracks metrics for file summarization, token usage, and context management.
 * Provides telemetry data for monitoring and optimization.
 */

/**
 * Telemetry event types
 */
export type TelemetryEventType =
  | "summarization_request"
  | "summarization_success"
  | "summarization_error"
  | "truncation_event"
  | "context_built"
  | "file_reference_detected";

/**
 * Telemetry event data
 */
export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: number;
  data: Record<string, any>;
}

/**
 * Summarization metrics
 */
export interface SummarizationMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  averageLatency: number;
  averageCompressionRatio: number;
  totalTokensSaved: number;
}

/**
 * Context metrics
 */
export interface ContextMetrics {
  averageContextSize: number;
  maxContextSize: number;
  truncationCount: number;
  fileReferenceHitRate: number;
}

/**
 * File context analytics tracker
 */
export class FileContextAnalytics {
  private events: TelemetryEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events
  private readonly storageKey = "file_context_analytics";

  constructor() {
    // Load persisted events from sessionStorage
    this.loadFromStorage();
  }

  /**
   * Track a telemetry event
   */
  track(type: TelemetryEventType, data: Record<string, any> = {}): void {
    const event: TelemetryEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    this.events.push(event);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Persist to sessionStorage
    this.saveToStorage();

    // Log if debug mode is enabled
    if (this.isDebugMode()) {
      console.log(`[File Context Analytics] ${type}:`, data);
    }
  }

  /**
   * Get summarization metrics
   */
  getSummarizationMetrics(): SummarizationMetrics {
    const requests = this.events.filter(
      (e) => e.type === "summarization_request"
    );
    const successes = this.events.filter(
      (e) => e.type === "summarization_success"
    );
    const errors = this.events.filter((e) => e.type === "summarization_error");

    // Calculate average latency
    const latencies = successes
      .map((e) => e.data.latency)
      .filter((l) => typeof l === "number");
    const averageLatency =
      latencies.length > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        : 0;

    // Calculate average compression ratio
    const compressionRatios = successes
      .map((e) => {
        const original = e.data.originalTokens;
        const summary = e.data.summaryTokens;
        if (!original || !summary) return null;
        return ((original - summary) / original) * 100;
      })
      .filter((r): r is number => r !== null);

    const averageCompressionRatio =
      compressionRatios.length > 0
        ? compressionRatios.reduce((sum, r) => sum + r, 0) /
          compressionRatios.length
        : 0;

    // Calculate total tokens saved
    const totalTokensSaved = successes.reduce((sum, e) => {
      const original = e.data.originalTokens || 0;
      const summary = e.data.summaryTokens || 0;
      return sum + (original - summary);
    }, 0);

    return {
      totalRequests: requests.length,
      successCount: successes.length,
      errorCount: errors.length,
      averageLatency: Math.round(averageLatency),
      averageCompressionRatio: Math.round(averageCompressionRatio * 10) / 10,
      totalTokensSaved,
    };
  }

  /**
   * Get context metrics
   */
  getContextMetrics(): ContextMetrics {
    const contextEvents = this.events.filter((e) => e.type === "context_built");
    const truncationEvents = this.events.filter(
      (e) => e.type === "truncation_event"
    );
    const fileReferenceEvents = this.events.filter(
      (e) => e.type === "file_reference_detected"
    );

    // Calculate average and max context size
    const contextSizes = contextEvents
      .map((e) => e.data.totalTokens)
      .filter((s) => typeof s === "number");

    const averageContextSize =
      contextSizes.length > 0
        ? contextSizes.reduce((sum, s) => sum + s, 0) / contextSizes.length
        : 0;

    const maxContextSize =
      contextSizes.length > 0 ? Math.max(...contextSizes) : 0;

    // Calculate file reference hit rate
    const fileReferenceHitRate =
      contextEvents.length > 0
        ? (fileReferenceEvents.length / contextEvents.length) * 100
        : 0;

    return {
      averageContextSize: Math.round(averageContextSize),
      maxContextSize,
      truncationCount: truncationEvents.length,
      fileReferenceHitRate: Math.round(fileReferenceHitRate * 10) / 10,
    };
  }

  /**
   * Get all events (for debugging)
   */
  getAllEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  /**
   * Clear all analytics data
   */
  clear(): void {
    this.events = [];
    this.clearStorage();
  }

  /**
   * Check if debug mode is enabled
   */
  private isDebugMode(): boolean {
    // Check if DEBUG_FILE_CONTEXT is set in environment or localStorage
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("DEBUG_FILE_CONTEXT") === "true" ||
        window.location.search.includes("debug_file_context=true")
      );
    }
    return process.env.DEBUG_FILE_CONTEXT === "true";
  }

  /**
   * Save events to sessionStorage
   */
  private saveToStorage(): void {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        sessionStorage.setItem(this.storageKey, JSON.stringify(this.events));
      } catch (error) {
        console.error("[Analytics] Failed to save to sessionStorage:", error);
      }
    }
  }

  /**
   * Load events from sessionStorage
   */
  private loadFromStorage(): void {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const stored = sessionStorage.getItem(this.storageKey);
        if (stored) {
          this.events = JSON.parse(stored);
        }
      } catch (error) {
        console.error(
          "[Analytics] Failed to load from sessionStorage:",
          error
        );
        this.events = [];
      }
    }
  }

  /**
   * Clear sessionStorage
   */
  private clearStorage(): void {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        sessionStorage.removeItem(this.storageKey);
      } catch (error) {
        console.error(
          "[Analytics] Failed to clear sessionStorage:",
          error
        );
      }
    }
  }

  /**
   * Print debug summary to console
   */
  printDebugSummary(): void {
    const summarizationMetrics = this.getSummarizationMetrics();
    const contextMetrics = this.getContextMetrics();

    console.log("\n=== File Context Debug Summary ===");
    console.log("\nSummarization:");
    console.log(
      `  Total requests: ${summarizationMetrics.totalRequests}`
    );
    console.log(
      `  Success rate: ${summarizationMetrics.successCount}/${summarizationMetrics.totalRequests} (${((summarizationMetrics.successCount / summarizationMetrics.totalRequests) * 100 || 0).toFixed(1)}%)`
    );
    console.log(
      `  Average latency: ${summarizationMetrics.averageLatency}ms`
    );
    console.log(
      `  Average compression: ${summarizationMetrics.averageCompressionRatio}%`
    );
    console.log(
      `  Total tokens saved: ${summarizationMetrics.totalTokensSaved.toLocaleString()}`
    );

    console.log("\nContext:");
    console.log(
      `  Average size: ${contextMetrics.averageContextSize.toLocaleString()} tokens`
    );
    console.log(
      `  Max size: ${contextMetrics.maxContextSize.toLocaleString()} tokens`
    );
    console.log(
      `  Truncation events: ${contextMetrics.truncationCount}`
    );
    console.log(
      `  File reference hit rate: ${contextMetrics.fileReferenceHitRate}%`
    );
    console.log("\n===================================\n");
  }
}

/**
 * Global analytics instance
 */
let analyticsInstance: FileContextAnalytics | null = null;

/**
 * Get the global analytics instance
 */
export function getFileContextAnalytics(): FileContextAnalytics {
  if (!analyticsInstance) {
    analyticsInstance = new FileContextAnalytics();
  }
  return analyticsInstance;
}

/**
 * Track a file context event
 */
export function trackFileContextEvent(
  type: TelemetryEventType,
  data: Record<string, any> = {}
): void {
  const analytics = getFileContextAnalytics();
  analytics.track(type, data);
}
