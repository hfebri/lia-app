"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  MessageSquare,
  FileText,
  TrendingUp,
  Clock,
  Activity,
  Database,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardData {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
    period: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: "up" | "down" | "neutral";
}

interface AdminStatsProps {
  stats: StatCardData[];
  className?: string;
}

export function AdminStats({ stats, className }: AdminStatsProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  trend = "neutral",
}: StatCardData) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center text-xs text-muted-foreground">
            {change.type === "increase" ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingUp className="h-3 w-3 mr-1 rotate-180 text-red-500" />
            )}
            <span
              className={cn(
                change.type === "increase" ? "text-green-500" : "text-red-500"
              )}
            >
              {change.type === "increase" ? "+" : "-"}
              {Math.abs(change.value)}%
            </span>
            <span className="ml-1">from {change.period}</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Default stats for demo purposes
export const defaultAdminStats: StatCardData[] = [
  {
    title: "Total Users",
    value: "2,543",
    change: { value: 12, type: "increase", period: "last month" },
    icon: Users,
    description: "Active users in the system",
  },
  {
    title: "Messages Today",
    value: "1,234",
    change: { value: 8, type: "increase", period: "yesterday" },
    icon: MessageSquare,
    description: "Messages sent today",
  },
  {
    title: "Files Uploaded",
    value: "487",
    change: { value: 3, type: "decrease", period: "last week" },
    icon: FileText,
    description: "Total files in system",
  },
  {
    title: "System Uptime",
    value: "99.9%",
    icon: Activity,
    description: "Last 30 days availability",
  },
  {
    title: "Avg Response Time",
    value: "1.2s",
    change: { value: 5, type: "decrease", period: "last hour" },
    icon: Zap,
    description: "Average AI response time",
  },
  {
    title: "Active Sessions",
    value: "156",
    icon: Clock,
    description: "Currently active user sessions",
  },
  {
    title: "Database Size",
    value: "2.1 GB",
    change: { value: 15, type: "increase", period: "last month" },
    icon: Database,
    description: "Total database storage",
  },
  {
    title: "Daily Active Users",
    value: "892",
    change: { value: 7, type: "increase", period: "yesterday" },
    icon: TrendingUp,
    description: "Users active in last 24h",
  },
];

export { StatCard };
