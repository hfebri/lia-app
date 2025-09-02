"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileAttachment } from "./file-attachment";
import { cn } from "@/lib/utils";
import { Files, Search, Filter, SortAsc, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt: Date;
  analysis?: {
    status: "pending" | "processing" | "completed" | "error";
    extractedText?: string;
    summary?: string;
    insights?: string[];
  };
}

interface FileListProps {
  files: FileItem[];
  onFileSelect?: (file: FileItem) => void;
  onFileAnalyze?: (file: FileItem) => void;
  onFileDownload?: (file: FileItem) => void;
  onFileDelete?: (file: FileItem) => void;
  onUploadClick?: () => void;
  selectedFileId?: string;
  className?: string;
}

type SortOption = "name" | "date" | "size" | "type";
type FilterOption = "all" | "analyzed" | "pending" | "processing";

export function FileList({
  files,
  onFileSelect,
  onFileAnalyze,
  onFileDownload,
  onFileDelete,
  onUploadClick,
  selectedFileId,
  className,
}: FileListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  // Filter and sort files
  const filteredAndSortedFiles = files
    .filter((file) => {
      // Search filter
      if (
        searchQuery &&
        !file.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (filterBy !== "all") {
        const status = file.analysis?.status || "pending";
        if (filterBy === "analyzed" && status !== "completed") return false;
        if (filterBy === "pending" && status !== "pending") return false;
        if (filterBy === "processing" && status !== "processing") return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return b.size - a.size;
        case "type":
          return a.type.localeCompare(b.type);
        case "date":
        default:
          return b.uploadedAt.getTime() - a.uploadedAt.getTime();
      }
    });

  const getStatusCount = (status: FilterOption) => {
    if (status === "all") return files.length;
    return files.filter((file) => {
      const fileStatus = file.analysis?.status || "pending";
      if (status === "analyzed") return fileStatus === "completed";
      if (status === "pending") return fileStatus === "pending";
      if (status === "processing") return fileStatus === "processing";
      return false;
    }).length;
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Files className="mr-2 h-5 w-5" />
            Files
          </CardTitle>
          {onUploadClick && (
            <Button size="sm" onClick={onUploadClick}>
              <Upload className="mr-1 h-4 w-4" />
              Upload
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Filters and Sort */}
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="mr-1 h-3 w-3" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterBy("all")}>
                  All Files ({getStatusCount("all")})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterBy("analyzed")}>
                  Analyzed ({getStatusCount("analyzed")})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBy("processing")}>
                  Processing ({getStatusCount("processing")})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBy("pending")}>
                  Pending ({getStatusCount("pending")})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <SortAsc className="mr-1 h-3 w-3" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy("date")}>
                  Date uploaded
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("name")}>
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("size")}>
                  File size
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("type")}>
                  File type
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {filteredAndSortedFiles.length === 0 ? (
            <div className="text-center py-8">
              <Files className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery || filterBy !== "all"
                  ? "No files match your criteria"
                  : "No files uploaded yet"}
              </p>
              {onUploadClick && !searchQuery && filterBy === "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUploadClick}
                  className="mt-3"
                >
                  <Upload className="mr-1 h-4 w-4" />
                  Upload your first file
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedFiles.map((file) => (
                <div key={file.id}>
                  <FileAttachment
                    file={file}
                    onView={onFileSelect as any}
                    onDownload={onFileDownload as any}
                    onAnalyze={onFileAnalyze as any}
                    compact
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedFileId === file.id && "ring-2 ring-primary"
                    )}
                    onClick={() => onFileSelect?.(file)}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
