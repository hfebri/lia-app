"use client";

import { useState, useCallback, useEffect } from "react";
import {
  AppError,
  handleError,
  getUserFriendlyMessage,
  isRetryableError,
} from "@/lib/utils/error-handling";
import { toast } from "sonner";

export interface ErrorState {
  error: AppError | null;
  isRetrying: boolean;
  retryCount: number;
  lastRetryAt: Date | null;
}

export interface UseErrorHandlerOptions {
  showToast?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: AppError) => void;
  onRetry?: (retryCount: number) => void;
  onMaxRetriesReached?: (error: AppError) => void;
}

export interface UseErrorHandlerReturn {
  error: AppError | null;
  isRetrying: boolean;
  retryCount: number;
  hasError: boolean;
  captureError: (error: unknown, context?: Record<string, any>) => void;
  clearError: () => void;
  retry: () => Promise<void>;
  canRetry: boolean;
  withErrorHandling: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: Record<string, any>
  ) => (...args: T) => Promise<R | null>;
}

export function useErrorHandler(
  options: UseErrorHandlerOptions = {}
): UseErrorHandlerReturn {
  const {
    showToast = true,
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    lastRetryAt: null,
  });

  const [retryFunction, setRetryFunction] = useState<
    (() => Promise<void>) | null
  >(null);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      lastRetryAt: null,
    });
    setRetryFunction(null);
  }, []);

  const retry = useCallback(async () => {
    if (
      !errorState.error ||
      !retryFunction ||
      errorState.retryCount >= maxRetries
    ) {
      return;
    }

    setErrorState((prev) => ({
      ...prev,
      isRetrying: true,
    }));

    // Add delay before retry
    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    try {
      await retryFunction();

      // Success - clear error
      clearError();

      // Show success toast
      if (showToast) {
        toast.success("Operation completed successfully");
      }
    } catch (error) {
      const newRetryCount = errorState.retryCount + 1;
      const appError = handleError(error);

      setErrorState((prev) => ({
        ...prev,
        error: appError,
        isRetrying: false,
        retryCount: newRetryCount,
        lastRetryAt: new Date(),
      }));

      if (newRetryCount >= maxRetries) {
        onMaxRetriesReached?.(appError);
        if (showToast) {
          toast.error("Maximum retry attempts reached", {
            description: "Please try again later or contact support.",
          });
        }
      } else {
        onRetry?.(newRetryCount);
        if (showToast) {
          toast.error(`Retry ${newRetryCount}/${maxRetries} failed`, {
            description: "Will try again automatically...",
          });
        }
      }
    }
  }, [
    errorState.error,
    errorState.retryCount,
    retryFunction,
    maxRetries,
    retryDelay,
    showToast,
    onRetry,
    onMaxRetriesReached,
    clearError,
  ]);

  const captureError = useCallback(
    (error: unknown, context?: Record<string, any>) => {
      const appError = handleError(error, context);

      setErrorState((prev) => ({
        ...prev,
        error: appError,
        isRetrying: false,
      }));

      // Show toast notification if enabled
      if (showToast) {
        const message = getUserFriendlyMessage(appError);
        toast.error(message, {
          description: appError.code
            ? `Error code: ${appError.code}`
            : undefined,
          action:
            isRetryableError(appError) && errorState.retryCount < maxRetries
              ? {
                  label: "Retry",
                  onClick: () => retry(),
                }
              : undefined,
        });
      }

      // Call custom error handler
      onError?.(appError);
    },
    [showToast, onError, maxRetries, errorState.retryCount, retry]
  );

  // Function to set a retry function
  const setRetryFn = useCallback((fn: () => Promise<void>) => {
    setRetryFunction(() => fn);
  }, []);

  const canRetry = Boolean(
    errorState.error &&
      isRetryableError(errorState.error) &&
      errorState.retryCount < maxRetries &&
      !errorState.isRetrying &&
      retryFunction
  );

  // Return the error handler interface
  return {
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    hasError: Boolean(errorState.error),
    captureError,
    clearError,
    retry,
    canRetry,
    // Helper method to wrap async functions with error handling
    withErrorHandling: useCallback(
      <T extends any[], R>(
        fn: (...args: T) => Promise<R>,
        context?: Record<string, any>
      ) => {
        setRetryFn(async () => {
          await fn(...([] as any));
        });

        return async (...args: T): Promise<R | null> => {
          try {
            clearError();
            const result = await fn(...args);
            return result;
          } catch (error) {
            captureError(error, { ...context, functionName: fn.name });
            return null;
          }
        };
      },
      [captureError, clearError, setRetryFn]
    ),
  };
}

// Specialized hook for API calls
export function useApiErrorHandler(options: UseErrorHandlerOptions = {}) {
  const errorHandler = useErrorHandler({
    ...options,
    showToast: options.showToast ?? true,
  });

  const handleApiCall = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      context?: Record<string, any>
    ): Promise<T | null> => {
      try {
        errorHandler.clearError();
        const result = await apiCall();
        return result;
      } catch (error) {
        // Enhanced API error context
        const apiContext = {
          ...context,
          timestamp: new Date().toISOString(),
          userAgent: navigator?.userAgent,
          url: window?.location.href,
        };

        errorHandler.captureError(error, apiContext);
        return null;
      }
    },
    [errorHandler]
  );

  return {
    ...errorHandler,
    handleApiCall,
  };
}

// Hook for form error handling
export function useFormErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const errorHandler = useErrorHandler({
    ...options,
    showToast: options.showToast ?? false, // Usually don't show toast for form errors
  });

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return {
    ...errorHandler,
    fieldErrors,
    hasFieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    clearAllErrors: useCallback(() => {
      errorHandler.clearError();
      clearAllFieldErrors();
    }, [errorHandler.clearError, clearAllFieldErrors]),
  };
}

// Global error handler hook
export function useGlobalErrorHandler(): void {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {

      // Prevent the default browser behavior
      event.preventDefault();

      // Show a user-friendly error message
      toast.error("An unexpected error occurred", {
        description: "Our team has been notified. Please try again.",
      });
    };

    const handleError = (event: ErrorEvent) => {

      // Show a user-friendly error message
      toast.error("Something went wrong", {
        description: "Please refresh the page and try again.",
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, []);
}
