"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityChartProps {
  data?: Array<{
    day: string;
    date: string;
    messages: number;
    conversations: number;
  }>;
}

export function ActivityChart({ data }: ActivityChartProps) {
  // Fallback data if no data is provided
  const chartData = data || [
    { day: "Mon", date: "", messages: 0, conversations: 0 },
    { day: "Tue", date: "", messages: 0, conversations: 0 },
    { day: "Wed", date: "", messages: 0, conversations: 0 },
    { day: "Thu", date: "", messages: 0, conversations: 0 },
    { day: "Fri", date: "", messages: 0, conversations: 0 },
    { day: "Sat", date: "", messages: 0, conversations: 0 },
    { day: "Sun", date: "", messages: 0, conversations: 0 },
  ];

  const maxMessages = Math.max(...chartData.map((d) => d.messages), 1);
  const maxConversations = Math.max(...chartData.map((d) => d.conversations), 1);
  const totalMessages = chartData.reduce((sum, d) => sum + d.messages, 0);
  const totalConversations = chartData.reduce((sum, d) => sum + d.conversations, 0);
  const avgMessages = totalMessages / chartData.length;

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between h-40 px-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1 h-32 justify-end">
                <Skeleton className="w-4 h-16" />
                <Skeleton className="w-4 h-8" />
              </div>
              <Skeleton className="w-8 h-3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simple Bar Chart */}
      <div className="flex items-end justify-between h-40 px-2">
        {chartData.map((item, index) => (
          <div
            key={item.day + index}
            className="flex flex-col items-center gap-2 flex-1"
          >
            <div className="flex flex-col items-center gap-1 h-32 justify-end">
              {/* Messages Bar */}
              <div
                className="bg-blue-500 w-4 rounded-t transition-all duration-300 hover:bg-blue-600 cursor-pointer"
                style={{
                  height: maxMessages > 0 ? `${(item.messages / maxMessages) * 100}%` : "4px",
                  minHeight: "4px",
                }}
                title={`${item.messages} messages${item.date ? ` on ${item.date}` : ''}`}
              />
              {/* Conversations Bar */}
              <div
                className="bg-green-500 w-4 rounded-t transition-all duration-300 hover:bg-green-600 cursor-pointer"
                style={{
                  height: maxConversations > 0 ? `${(item.conversations / maxConversations) * 60}%` : "2px",
                  minHeight: "2px",
                }}
                title={`${item.conversations} conversations${item.date ? ` on ${item.date}` : ''}`}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {item.day}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-muted-foreground">Messages</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-muted-foreground">Conversations</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalMessages}</div>
          <div className="text-xs text-muted-foreground">Total Messages</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalConversations}</div>
          <div className="text-xs text-muted-foreground">Conversations</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{avgMessages.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Avg Messages/Day</div>
        </div>
      </div>
    </div>
  );
}
