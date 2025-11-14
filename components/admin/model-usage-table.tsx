"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronDown,
  ChevronRight,
  Download,
  ArrowUpDown,
} from "lucide-react";
import type { UserModelUsage } from "@/lib/services/analytics";
import { format } from "date-fns";

interface ModelUsageTableProps {
  data: UserModelUsage[];
}

type SortField = "name" | "conversations" | "messages";
type SortDirection = "asc" | "desc";

export function ModelUsageTable({ data }: ModelUsageTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("conversations");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "name":
        const nameA = a.userName || a.email;
        const nameB = b.userName || b.email;
        comparison = nameA.localeCompare(nameB);
        break;
      case "conversations":
        comparison = a.totalConversations - b.totalConversations;
        break;
      case "messages":
        comparison = a.totalMessages - b.totalMessages;
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleExport = () => {
    // Create CSV content
    const headers = ["User", "Email", "Model", "Conversations", "Messages", "Last Used"];
    const rows = data.flatMap((user) =>
      user.modelUsage.map((model) => [
        user.userName || "",
        user.email,
        model.modelName,
        model.conversationCount.toString(),
        model.messageCount.toString(),
        format(new Date(model.lastUsed), "yyyy-MM-dd HH:mm:ss"),
      ])
    );

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `model-usage-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No usage data found for the selected filters
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[50px] bg-background"></TableHead>
              <TableHead className="bg-background">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("name")}
                  className="font-semibold"
                >
                  User
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="bg-background">Email</TableHead>
              <TableHead className="text-right bg-background">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("conversations")}
                  className="font-semibold"
                >
                  Conversations
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right bg-background">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("messages")}
                  className="font-semibold"
                >
                  Messages
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="bg-background">Models Used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((user) => {
              const isExpanded = expandedRows.has(user.userId);

              return (
                <React.Fragment key={user.userId}>
                  <TableRow className="cursor-pointer">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(user.userId)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImage || undefined} />
                          <AvatarFallback>
                            {(user.userName || user.email)
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {user.userName || "No name"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {user.totalConversations}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {user.totalMessages}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.modelUsage.map((model) => (
                          <Badge
                            key={model.model}
                            variant="secondary"
                            className="text-xs"
                          >
                            {model.modelName}: {model.conversationCount}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded row details */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/50">
                        <div className="p-4 space-y-3">
                          <h4 className="font-semibold text-sm">
                            Model Breakdown
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {user.modelUsage.map((model) => (
                              <div
                                key={model.model}
                                className="border rounded-lg p-3 bg-background"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-medium">
                                      {model.modelName}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {model.provider}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {model.provider}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Conversations:
                                    </span>
                                    <span className="font-medium">
                                      {model.conversationCount}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Messages:
                                    </span>
                                    <span className="font-medium">
                                      {model.messageCount}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Last Used:
                                    </span>
                                    <span className="font-medium text-xs">
                                      {format(
                                        new Date(model.lastUsed),
                                        "MMM dd, yyyy"
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
