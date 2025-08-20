"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MessageSquare,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface UsageMetricsData {
  today: {
    messages: number;
    conversations: number;
    files: number;
    activeUsers: number;
  };
  thisWeek: {
    messages: number;
    conversations: number;
    files: number;
    activeUsers: number;
  };
  thisMonth: {
    messages: number;
    conversations: number;
    files: number;
    activeUsers: number;
  };
  growth: {
    messages: number;
    conversations: number;
    files: number;
    users: number;
  };
}

interface UsageMetricsProps {
  data: UsageMetricsData;
  className?: string;
}

export function UsageMetrics({ data, className }: UsageMetricsProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getGrowthBadge = (growth: number) => {
    const isPositive = growth > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <Badge
        variant={isPositive ? "default" : "destructive"}
        className="flex items-center space-x-1"
      >
        <Icon className="h-3 w-3" />
        <span>{Math.abs(growth)}%</span>
      </Badge>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Current Period Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Messages Today
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.today.messages)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">vs. yesterday</p>
              {getGrowthBadge(data.growth.messages)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.today.activeUsers)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">last 24 hours</p>
              {getGrowthBadge(data.growth.users)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.today.conversations)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">started today</p>
              {getGrowthBadge(data.growth.conversations)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Files Uploaded
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.today.files)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">today</p>
              {getGrowthBadge(data.growth.files)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Activity Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Today</span>
                <span className="text-sm text-muted-foreground">
                  {data.today.messages} messages
                </span>
              </div>
              <Progress
                value={(data.today.messages / data.thisWeek.messages) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">This Week</span>
                <span className="text-sm text-muted-foreground">
                  {formatNumber(data.thisWeek.messages)} messages
                </span>
              </div>
              <Progress
                value={(data.thisWeek.messages / data.thisMonth.messages) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">This Month</span>
                <span className="text-sm text-muted-foreground">
                  {formatNumber(data.thisMonth.messages)} messages
                </span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* User Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Engagement</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-center">
                  {(data.today.messages / data.today.activeUsers).toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Avg Messages/User
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-center">
                  {(data.today.conversations / data.today.activeUsers).toFixed(
                    1
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Avg Conversations/User
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>User Retention (Daily)</span>
                <span className="font-medium">87%</span>
              </div>
              <Progress value={87} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>User Retention (Weekly)</span>
                <span className="font-medium">64%</span>
              </div>
              <Progress value={64} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Performance Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Avg Response Time</span>
              </div>
              <div className="text-2xl font-bold">1.2s</div>
              <p className="text-xs text-muted-foreground">
                -5% from last hour
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">System Uptime</span>
              </div>
              <div className="text-2xl font-bold">99.9%</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Database Health</span>
              </div>
              <div className="text-2xl font-bold">Good</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
