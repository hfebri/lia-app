"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Image, Archive, FileSpreadsheet } from "lucide-react";

export function FileAnalytics() {
  // Mock data for file analytics
  const fileTypes = [
    {
      type: "PDF",
      count: 8,
      percentage: 50,
      icon: FileText,
      color: "bg-red-500",
    },
    {
      type: "Images",
      count: 4,
      percentage: 25,
      icon: Image,
      color: "bg-blue-500",
    },
    {
      type: "Excel",
      count: 3,
      percentage: 18.75,
      icon: FileSpreadsheet,
      color: "bg-green-500",
    },
    {
      type: "Others",
      count: 1,
      percentage: 6.25,
      icon: Archive,
      color: "bg-gray-500",
    },
  ];

  const processingStats = {
    successful: 15,
    pending: 1,
    errors: 0,
    total: 16,
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
          <div className="text-lg font-bold">2.3MB</div>
          <div className="text-xs text-muted-foreground">Avg Size</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">98%</div>
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
