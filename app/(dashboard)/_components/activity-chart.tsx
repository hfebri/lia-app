"use client";

import { Card, CardContent } from "@/components/ui/card";

export function ActivityChart() {
  // Mock data for the chart - in real app this would come from analytics API
  const data = [
    { day: "Mon", messages: 12, conversations: 3 },
    { day: "Tue", messages: 25, conversations: 5 },
    { day: "Wed", messages: 18, conversations: 4 },
    { day: "Thu", messages: 32, conversations: 6 },
    { day: "Fri", messages: 28, conversations: 5 },
    { day: "Sat", messages: 15, conversations: 2 },
    { day: "Sun", messages: 22, conversations: 4 },
  ];

  const maxMessages = Math.max(...data.map((d) => d.messages));

  return (
    <div className="space-y-4">
      {/* Simple Bar Chart */}
      <div className="flex items-end justify-between h-40 px-2">
        {data.map((item) => (
          <div
            key={item.day}
            className="flex flex-col items-center gap-2 flex-1"
          >
            <div className="flex flex-col items-center gap-1 h-32 justify-end">
              {/* Messages Bar */}
              <div
                className="bg-blue-500 w-4 rounded-t transition-all duration-300 hover:bg-blue-600"
                style={{
                  height: `${(item.messages / maxMessages) * 100}%`,
                  minHeight: "4px",
                }}
                title={`${item.messages} messages`}
              />
              {/* Conversations Bar */}
              <div
                className="bg-green-500 w-4 rounded-t transition-all duration-300 hover:bg-green-600"
                style={{
                  height: `${(item.conversations / 6) * 60}%`,
                  minHeight: "2px",
                }}
                title={`${item.conversations} conversations`}
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
          <div className="text-2xl font-bold text-blue-600">152</div>
          <div className="text-xs text-muted-foreground">Total Messages</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">29</div>
          <div className="text-xs text-muted-foreground">Conversations</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">5.2</div>
          <div className="text-xs text-muted-foreground">Avg/Day</div>
        </div>
      </div>
    </div>
  );
}
