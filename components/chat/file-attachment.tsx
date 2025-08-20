"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  File,
  Download,
  Eye,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  analysis?: {
    status: "pending" | "processing" | "completed" | "error";
    extractedText?: string;
    summary?: string;
    insights?: string[];
  };
}

interface FileAttachmentProps {
  file: FileAttachment;
  onView?: (file: FileAttachment) => void;
  onDownload?: (file: FileAttachment) => void;
  onAnalyze?: (file: FileAttachment) => void;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

const fileTypeIcons = {
  document: FileText,
  image: Image,
  video: Film,
  audio: Music,
  archive: Archive,
  default: File,
};

const fileTypeColors = {
  document: "text-blue-600",
  image: "text-green-600",
  video: "text-purple-600",
  audio: "text-orange-600",
  archive: "text-gray-600",
  default: "text-gray-600",
};

const getFileType = (mimeType: string): keyof typeof fileTypeIcons => {
  const type = mimeType.toLowerCase();

  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (
    type.includes("pdf") ||
    type.includes("document") ||
    type.includes("text") ||
    type.includes("spreadsheet")
  )
    return "document";
  if (type.includes("zip") || type.includes("rar") || type.includes("tar"))
    return "archive";

  return "default";
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getAnalysisStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return { variant: "default" as const, text: "Analyzed" };
    case "processing":
      return { variant: "secondary" as const, text: "Processing" };
    case "error":
      return { variant: "destructive" as const, text: "Failed" };
    default:
      return { variant: "outline" as const, text: "Pending" };
  }
};

export function FileAttachment({
  file,
  onView,
  onDownload,
  onAnalyze,
  onClick,
  className,
  compact = false,
}: FileAttachmentProps) {
  const fileType = getFileType(file.type);
  const Icon = fileTypeIcons[fileType];
  const iconColor = fileTypeColors[fileType];
  const analysisStatus = getAnalysisStatusBadge(
    file.analysis?.status || "pending"
  );

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center space-x-2 p-2 rounded-md bg-accent/50",
          className
        )}
        onClick={onClick}
      >
        <Icon className={cn("h-4 w-4", iconColor)} />
        <span className="text-sm font-medium truncate flex-1">{file.name}</span>
        <Badge variant={analysisStatus.variant} className="text-xs">
          {analysisStatus.text}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <Icon className={cn("h-8 w-8 mt-0.5", iconColor)} />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium truncate">{file.name}</h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {fileType}
                </Badge>
                <Badge variant={analysisStatus.variant} className="text-xs">
                  {analysisStatus.text}
                </Badge>
              </div>

              {/* Analysis Preview */}
              {file.analysis?.status === "completed" &&
                file.analysis.summary && (
                  <div className="mt-2 p-2 bg-accent/50 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">
                      AI Summary:
                    </p>
                    <p className="text-sm">{file.analysis.summary}</p>
                  </div>
                )}

              {/* Insights */}
              {file.analysis?.insights && file.analysis.insights.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Key Insights:</p>
                  <div className="flex flex-wrap gap-1">
                    {file.analysis.insights
                      .slice(0, 3)
                      .map((insight, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {insight}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">File options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(file)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              )}
              {file.url && (
                <DropdownMenuItem asChild>
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in new tab
                  </a>
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem onClick={() => onDownload(file)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
              )}
              {onAnalyze && file.analysis?.status !== "processing" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAnalyze(file)}>
                    <FileText className="mr-2 h-4 w-4" />
                    {file.analysis?.status === "completed"
                      ? "Re-analyze"
                      : "Analyze"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
