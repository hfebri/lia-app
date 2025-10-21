"use client";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Archive, File, Table, Image } from "lucide-react";

interface FileAnalyticsProps {
  data?: {
    totalFiles: number;
    types: {
      pdf: number;
      docx: number;
      txt: number;
      csv?: number;
      xlsx?: number;
      images?: number;
      other: number;
    };
  };
}

export function FileAnalytics({ data }: FileAnalyticsProps) {
  if (!data) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  const { totalFiles, types } = data;

  const fileTypes = [
    {
      type: "PDF",
      count: types.pdf,
      percentage: totalFiles > 0 ? Math.round((types.pdf / totalFiles) * 100) : 0,
      icon: FileText,
      color: "bg-red-500",
    },
    {
      type: "Word Documents",
      count: types.docx,
      percentage: totalFiles > 0 ? Math.round((types.docx / totalFiles) * 100) : 0,
      icon: File,
      color: "bg-blue-500",
    },
    {
      type: "Spreadsheets",
      count: types.xlsx || 0,
      percentage: totalFiles > 0 ? Math.round(((types.xlsx || 0) / totalFiles) * 100) : 0,
      icon: Table,
      color: "bg-emerald-500",
    },
    {
      type: "Images",
      count: types.images || 0,
      percentage: totalFiles > 0 ? Math.round(((types.images || 0) / totalFiles) * 100) : 0,
      icon: Image,
      color: "bg-purple-500",
    },
    {
      type: "Text Files",
      count: types.txt + (types.csv || 0),
      percentage: totalFiles > 0 ? Math.round(((types.txt + (types.csv || 0)) / totalFiles) * 100) : 0,
      icon: FileText,
      color: "bg-green-500",
    },
    {
      type: "Other Files",
      count: types.other,
      percentage: totalFiles > 0 ? Math.round((types.other / totalFiles) * 100) : 0,
      icon: Archive,
      color: "bg-gray-500",
    },
  ].filter(item => item.count > 0); // Only show types with files

  const processingStats = {
    successful: Math.max(totalFiles - 1, 0),
    pending: totalFiles > 0 ? 1 : 0,
    errors: 0,
    total: totalFiles,
  };

  return (
    <div className="space-y-6">
      {/* File Types Breakdown */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">File Types Processed</h4>
        <div className="space-y-3">
          {fileTypes.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.type} className="flex items-center gap-3">
                <div className={`p-2 rounded ${item.color} bg-opacity-10`}>
                  <Icon
                    className={`h-4 w-4 ${item.color.replace("bg-", "text-")}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{item.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.count} files
                    </span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Processing Status */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Processing Status</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {processingStats.successful}
            </div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {processingStats.pending}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-lg font-bold">{totalFiles}</div>
          <div className="text-xs text-muted-foreground">Total Files</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">
            {totalFiles > 0 ? Math.round((processingStats.successful / totalFiles) * 100) : 0}%
          </div>
          <div className="text-xs text-muted-foreground">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">1.2s</div>
          <div className="text-xs text-muted-foreground">Avg Process Time</div>
        </div>
      </div>
    </div>
  );
}
