"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAppError,
  createErrorReport,
  ERROR_CODES,
} from "@/lib/utils/error-handling";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: "page" | "component" | "section";
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Create error report for tracking
    const appError = createAppError(error.message, {
      code: ERROR_CODES.UNKNOWN_ERROR,
      cause: error,
    });

    const errorReport = createErrorReport(appError);

    return {
      hasError: true,
      error,
      errorId: errorReport.id,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log error for monitoring (in production, this would go to error tracking service)
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      // Production error logging would go here
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      retryCount: this.state.retryCount + 1,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          level={this.props.level}
          showErrorDetails={this.props.showErrorDetails}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
  level?: "page" | "component" | "section";
  showErrorDetails?: boolean;
  onReset: () => void;
}

export function ErrorFallback({
  error,
  errorInfo,
  errorId,
  retryCount,
  level = "page",
  showErrorDetails = false,
  onReset,
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  const copyErrorDetails = () => {
    const errorDetails = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    navigator.clipboard
      .writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        toast.success("Error details copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy error details");
      });
  };

  // Component-level error fallback
  if (level === "component" || level === "section") {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-destructive">
                  Component Error
                </h4>
                {errorId && (
                  <Badge variant="secondary" className="text-xs">
                    {errorId}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {error?.message ||
                  "An unexpected error occurred in this component"}
              </p>

              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={onReset}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>

                {showErrorDetails && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? (
                      <ChevronUp className="w-3 h-3 mr-1" />
                    ) : (
                      <ChevronDown className="w-3 h-3 mr-1" />
                    )}
                    Details
                  </Button>
                )}

                <Button size="sm" variant="ghost" onClick={copyErrorDetails}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>

              {showDetails && process.env.NODE_ENV === "development" && (
                <div className="mt-3 p-2 bg-muted rounded text-xs font-mono">
                  <pre className="whitespace-pre-wrap break-all">
                    {error?.stack}
                  </pre>
                </div>
              )}

              {retryCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Retry attempts: {retryCount}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Page-level error fallback
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <Bug className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. Our team has been automatically
            notified.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {errorId && (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm text-muted-foreground">Error ID:</span>
              <Badge variant="secondary" className="font-mono">
                {errorId}
              </Badge>
              <Button size="sm" variant="ghost" onClick={copyErrorDetails}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          )}

          <Separator />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onReset} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          {retryCount > 0 && (
            <div className="text-center">
              <Badge variant="secondary">Retry attempts: {retryCount}</Badge>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <Button
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full justify-between"
            >
              <span>Technical Details</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>

            {showDetails && (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Error Message</h4>
                  <p className="text-sm font-mono break-all">
                    {error?.message || "Unknown error"}
                  </p>
                </div>

                {process.env.NODE_ENV === "development" && (
                  <>
                    {error?.stack && (
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="text-sm font-medium mb-2">
                          Stack Trace
                        </h4>
                        <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {errorInfo?.componentStack && (
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="text-sm font-medium mb-2">
                          Component Stack
                        </h4>
                        <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    Need help? Contact support with the error ID above.
                  </span>
                  <Button size="sm" variant="ghost" asChild>
                    <a
                      href="mailto:support@liaapp.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Support
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
