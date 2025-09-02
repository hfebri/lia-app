/**
 * Comprehensive error handling utilities
 */

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  timestamp?: Date;
  stack?: string;
}

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorReport {
  id: string;
  message: string;
  code?: string;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
}

/**
 * Create a standardized error object
 */
export function createAppError(
  message: string,
  options: {
    code?: string;
    statusCode?: number;
    context?: Record<string, any>;
    cause?: Error;
  } = {}
): AppError {
  const error = new Error(message) as AppError;
  error.code = options.code;
  error.statusCode = options.statusCode;
  error.context = options.context;
  error.timestamp = new Date();

  if (options.cause) {
    error.stack = options.cause.stack;
  }

  return error;
}

/**
 * Error code constants
 */
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  CONNECTION_LOST: "CONNECTION_LOST",

  // Authentication errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED: "MISSING_REQUIRED",

  // API errors
  API_ERROR: "API_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",

  // File errors
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  UPLOAD_FAILED: "UPLOAD_FAILED",

  // Database errors
  DATABASE_ERROR: "DATABASE_ERROR",
  QUERY_FAILED: "QUERY_FAILED",
  CONNECTION_FAILED: "CONNECTION_FAILED",

  // AI/Chat errors
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE",
  CONTEXT_LIMIT_EXCEEDED: "CONTEXT_LIMIT_EXCEEDED",

  // Unknown errors
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.NETWORK_ERROR]:
    "Unable to connect to the server. Please check your internet connection.",
  [ERROR_CODES.TIMEOUT_ERROR]:
    "The request took too long to complete. Please try again.",
  [ERROR_CODES.CONNECTION_LOST]:
    "Connection lost. Please check your internet connection.",

  [ERROR_CODES.UNAUTHORIZED]: "You need to log in to access this feature.",
  [ERROR_CODES.FORBIDDEN]: "You don't have permission to perform this action.",
  [ERROR_CODES.SESSION_EXPIRED]:
    "Your session has expired. Please log in again.",

  [ERROR_CODES.VALIDATION_ERROR]: "Please check your input and try again.",
  [ERROR_CODES.INVALID_INPUT]: "The information provided is not valid.",
  [ERROR_CODES.MISSING_REQUIRED]: "Please fill in all required fields.",

  [ERROR_CODES.API_ERROR]: "Something went wrong on our end. Please try again.",
  [ERROR_CODES.SERVER_ERROR]:
    "Server error occurred. Our team has been notified.",
  [ERROR_CODES.NOT_FOUND]: "The requested resource was not found.",
  [ERROR_CODES.RATE_LIMITED]:
    "Too many requests. Please wait a moment before trying again.",

  [ERROR_CODES.FILE_TOO_LARGE]:
    "The file is too large. Please select a smaller file.",
  [ERROR_CODES.INVALID_FILE_TYPE]: "This file type is not supported.",
  [ERROR_CODES.UPLOAD_FAILED]: "File upload failed. Please try again.",

  [ERROR_CODES.DATABASE_ERROR]:
    "Database error occurred. Please try again later.",
  [ERROR_CODES.QUERY_FAILED]:
    "Failed to retrieve data. Please refresh and try again.",
  [ERROR_CODES.CONNECTION_FAILED]: "Unable to connect to the database.",

  [ERROR_CODES.AI_SERVICE_ERROR]:
    "AI service is temporarily unavailable. Please try again.",
  [ERROR_CODES.MODEL_UNAVAILABLE]:
    "The selected AI model is currently unavailable.",
  [ERROR_CODES.CONTEXT_LIMIT_EXCEEDED]:
    "Message too long. Please shorten your message.",

  [ERROR_CODES.UNKNOWN_ERROR]:
    "An unexpected error occurred. Please try again.",
};

/**
 * Determine error severity based on error type
 */
export function getErrorSeverity(error: AppError): ErrorSeverity {
  const { code, statusCode } = error;

  // Critical errors
  if (
    code === ERROR_CODES.DATABASE_ERROR ||
    code === ERROR_CODES.SERVER_ERROR ||
    (statusCode && statusCode >= 500)
  ) {
    return "critical";
  }

  // High severity errors
  if (
    code === ERROR_CODES.UNAUTHORIZED ||
    code === ERROR_CODES.FORBIDDEN ||
    code === ERROR_CODES.SESSION_EXPIRED ||
    (statusCode && statusCode >= 400 && statusCode < 500)
  ) {
    return "high";
  }

  // Medium severity errors
  if (
    code === ERROR_CODES.NETWORK_ERROR ||
    code === ERROR_CODES.TIMEOUT_ERROR ||
    code === ERROR_CODES.API_ERROR
  ) {
    return "medium";
  }

  // Low severity errors (validation, user input, etc.)
  return "low";
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }

  // Fallback based on HTTP status codes
  if (error.statusCode) {
    switch (error.statusCode) {
      case 400:
        return "Invalid request. Please check your input.";
      case 401:
        return "Authentication required. Please log in.";
      case 403:
        return "Access denied. You don't have permission for this action.";
      case 404:
        return "The requested resource was not found.";
      case 429:
        return "Too many requests. Please wait before trying again.";
      case 500:
        return "Server error. Our team has been notified.";
      case 502:
        return "Service temporarily unavailable. Please try again later.";
      case 503:
        return "Service maintenance in progress. Please try again later.";
      default:
        return "An error occurred. Please try again.";
    }
  }

  return error.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}

/**
 * Create error report for logging/monitoring
 */
export function createErrorReport(
  error: AppError,
  context?: {
    userId?: string;
    url?: string;
    userAgent?: string;
    additionalContext?: Record<string, any>;
  }
): ErrorReport {
  return {
    id: generateErrorId(),
    message: error.message,
    code: error.code,
    severity: getErrorSeverity(error),
    timestamp: error.timestamp || new Date(),
    context: { ...error.context, ...context?.additionalContext },
    stack: error.stack,
    userAgent:
      context?.userAgent ||
      (typeof navigator !== "undefined" ? navigator.userAgent : undefined),
    url:
      context?.url ||
      (typeof window !== "undefined" ? window.location.href : undefined),
    userId: context?.userId,
  };
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `err_${timestamp}_${random}`;
}

/**
 * Log error to console with formatting
 */
export function logError(error: AppError, context?: Record<string, any>): void {
  const report = createErrorReport(error, context);

}

/**
 * Handle different types of errors consistently
 */
export function handleError(
  error: unknown,
  context?: Record<string, any>
): AppError {
  let appError: AppError;

  if (error instanceof Error) {
    // Convert regular Error to AppError
    appError = createAppError(error.message, {
      code: ERROR_CODES.UNKNOWN_ERROR,
      context,
      cause: error,
    });
  } else if (typeof error === "string") {
    // Handle string errors
    appError = createAppError(error, {
      code: ERROR_CODES.UNKNOWN_ERROR,
      context,
    });
  } else {
    // Handle unknown error types
    appError = createAppError("An unknown error occurred", {
      code: ERROR_CODES.UNKNOWN_ERROR,
      context: { ...context, originalError: error },
    });
  }

  // Log the error
  logError(appError, context);

  return appError;
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryCondition?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryCondition = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AppError): boolean {
  const retryableCodes = [
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.TIMEOUT_ERROR,
    ERROR_CODES.CONNECTION_LOST,
    ERROR_CODES.SERVER_ERROR,
    ERROR_CODES.RATE_LIMITED,
  ];

  return (
    retryableCodes.includes(error.code as any) ||
    (error.statusCode !== undefined &&
      (error.statusCode >= 500 ||
        error.statusCode === 429 ||
        error.statusCode === 408))
  );
}

/**
 * Safe async function wrapper with error handling
 */
export function safeAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | null> {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, { functionName: fn.name, arguments: args });
      return null;
    }
  };
}
