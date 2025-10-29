"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Cpu, Sparkles, Eye, Scan } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileProcessingProgress } from "@/lib/services/client-file-processor";

interface FileProcessingMessageProps {
  className?: string;
  progress?: Record<string, FileProcessingProgress>;
}

export function FileProcessingMessage({
  className,
  progress = {},
}: FileProcessingMessageProps) {
  const fileNames = Object.keys(progress);
  const hasProgress = fileNames.length > 0;

  return (
    <div className={cn("flex gap-3 p-4", className)}>
      {/* AI Avatar */}
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-white" />
      </div>

      {/* Processing Message */}
      <Card className="bg-muted/50 border-border max-w-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* File Icon with Animation */}
            <div className="relative">
              <FileText className="h-5 w-5 text-blue-600" />
              <div className="absolute -top-1 -right-1">
                {hasProgress ? (
                  <Scan className="h-3 w-3 text-orange-500 animate-pulse" />
                ) : (
                  <Cpu className="h-3 w-3 text-orange-500 animate-pulse" />
                )}
              </div>
            </div>

            {/* Processing Text and Animation */}
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground mb-1">
                {hasProgress
                  ? "Processing..."
                  : "Preparing files for analysis..."}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {hasProgress ? "Extracting text" : "Getting ready to process"}
              </div>

              {/* Animated Dots */}
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>

            {/* Processing Progress Animation */}
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200"></div>
              <div className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
            </div>
          </div>

          {/* File-specific Progress */}
          {hasProgress && (
            <div className="mt-3 space-y-3">
              {fileNames.map((fileName) => {
                const fileProgress = progress[fileName];
                return (
                  <div key={fileName} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate max-w-[200px]">
                        {fileName}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {fileProgress.progress}%
                      </span>
                    </div>
                    <Progress value={fileProgress.progress} className="h-1.5" />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {fileProgress.stage === "summarizing" ? (
                        <Sparkles className="h-3 w-3 animate-pulse" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                      <span>{fileProgress.message || fileProgress.stage}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Processing Steps - only show when no specific progress */}
          {!hasProgress && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span>Reading document structure</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse [animation-delay:0.5s]"></div>
                <span>Extracting text content</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse [animation-delay:1s]"></div>
                <span>Preparing for AI analysis</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
