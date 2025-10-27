"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  MessageSquare,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to console for debugging

    // In production, this would be sent to an error monitoring service
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error tracking service
      // Production error reporting would go here
    }
  }, [error]);

  const copyErrorDetails = () => {
    const errorDetails = {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-3xl">Application Error</CardTitle>
          <p className="text-muted-foreground mt-2 text-lg">
            We&apos;re sorry, but something went wrong with the application.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Information */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-medium mb-2">What happened?</h3>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while processing your request. Our
              development team has been automatically notified.
            </p>
          </div>

          {error.digest && (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm text-muted-foreground">Error ID:</span>
              <Badge variant="secondary" className="font-mono">
                {error.digest}
              </Badge>
              <Button size="sm" variant="ghost" onClick={copyErrorDetails}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          )}

          <Separator />

          {/* Primary Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-center">
              Or try these options:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/?newChat=1">
                  <MessageSquare className="w-3 h-3 mr-2" />
                  Start New Chat
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/admin">
                  <AlertTriangle className="w-3 h-3 mr-2" />
                  Admin Dashboard
                </Link>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Support Information */}
          <div className="text-center space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Need immediate help?
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                If this error persists, please contact our support team with the
                error ID above.
              </p>
              <Button size="sm" variant="outline" asChild>
                <a
                  href="mailto:support@liaapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Contact Support
                </a>
              </Button>
            </div>

            {/* Debug Information for Development */}
            {process.env.NODE_ENV === "development" && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Debug Information (Development Only)
                </summary>
                <div className="mt-3 space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="text-xs font-medium mb-2">Error Message</h4>
                    <p className="text-xs font-mono break-all">
                      {error.message}
                    </p>
                  </div>
                  {error.stack && (
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="text-xs font-medium mb-2">Stack Trace</h4>
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {error.digest && (
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="text-xs font-medium mb-2">Error Digest</h4>
                      <p className="text-xs font-mono break-all">
                        {error.digest}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
