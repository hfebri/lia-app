"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GlobalModelUsage } from "@/lib/services/analytics";

interface ModelUsageChartsProps {
  data: GlobalModelUsage[];
}

const COLORS = {
  openai: "#10B981",
  anthropic: "#8B5CF6",
  google: "#F59E0B",
};

const MODEL_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#8dd1e1",
  "#d084d0",
  "#a4de6c",
  "#d0ed57",
];

export function ModelUsageCharts({ data }: ModelUsageChartsProps) {
  // Prepare pie chart data for model distribution
  const pieChartData = data.map((model) => ({
    name: model.modelName,
    value: model.conversationCount,
    provider: model.provider,
  }));

  // Prepare bar chart data for model comparison
  const barChartData = data.map((model) => ({
    name: model.modelName,
    conversations: model.conversationCount,
    messages: model.messageCount,
    users: model.uniqueUsers,
  }));

  // Prepare provider comparison data
  const providerData = data.reduce((acc, model) => {
    // Normalize provider to lowercase for comparison
    const providerKey = model.provider.toLowerCase();
    const existing = acc.find((p) => p.providerKey === providerKey);
    if (existing) {
      existing.conversations += model.conversationCount;
      existing.messages += model.messageCount;
      existing.users += model.uniqueUsers;
    } else {
      acc.push({
        providerKey,
        provider:
          model.provider.charAt(0).toUpperCase() + model.provider.slice(1),
        conversations: model.conversationCount,
        messages: model.messageCount,
        users: model.uniqueUsers,
      });
    }
    return acc;
  }, [] as Array<{ providerKey: string; provider: string; conversations: number; messages: number; users: number }>);

  // Prepare trend data (combine all models' trends)
  const allDates = new Set<string>();
  data.forEach((model) => {
    model.trend.forEach((t) => allDates.add(t.date));
  });

  const trendData = Array.from(allDates)
    .sort()
    .map((date) => {
      const dataPoint: any = { date };
      data.forEach((model) => {
        const trend = model.trend.find((t) => t.date === date);
        // Use the unique model ID as the key instead of modelName to avoid collisions
        dataPoint[model.model] = trend ? trend.count : 0;
      });
      return dataPoint;
    });

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No data available for visualization
      </div>
    );
  }

  return (
    <div className="max-h-[700px] overflow-y-auto pr-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart - Model Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Model Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={MODEL_COLORS[index % MODEL_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart - Model Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="conversations" fill="#8884d8" name="Conversations" />
              <Bar dataKey="messages" fill="#82ca9d" name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Provider Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={providerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="provider" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="conversations" fill="#10B981" name="Conversations" />
              <Bar dataKey="users" fill="#8B5CF6" name="Unique Users" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.map((model, index) => (
                <Line
                  key={model.model}
                  type="monotone"
                  dataKey={model.model}
                  name={model.modelName}
                  stroke={MODEL_COLORS[index % MODEL_COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.map((model, index) => (
              <div
                key={model.model}
                className="border rounded-lg p-4"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: MODEL_COLORS[index % MODEL_COLORS.length],
                }}
              >
                <p className="text-sm font-medium text-muted-foreground">
                  {model.modelName}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {model.conversationCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {model.messageCount} messages • {model.uniqueUsers} users
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
