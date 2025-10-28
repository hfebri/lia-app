"use client";

import { useState } from "react";
import { useProductivityDashboard } from "@/hooks/use-productivity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Minus, Activity, Target, Zap, Award } from "lucide-react";

export default function ProductivityDashboard() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const { data, loading, error, refetch } = useProductivityDashboard(period);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Dashboard</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refetch}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              No productivity data has been calculated yet. Data will be available after your first day of activity.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getTrendIcon = () => {
    switch (data.trend.direction) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (data.trend.direction) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-yellow-500";
    if (score >= 20) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Exceptional";
    if (score >= 75) return "Strong";
    if (score >= 60) return "Good";
    if (score >= 40) return "Moderate";
    if (score >= 20) return "Low";
    return "Inactive";
  };

  // Calculate component scores from metrics
  const metrics = data.current.metrics;
  const activityScore = metrics ? calculateActivityScore(metrics) : 0;
  const engagementScore = metrics ? calculateEngagementScore(metrics) : 0;
  const efficiencyScore = metrics ? calculateEfficiencyScore(metrics) : 0;
  const valueScore = metrics ? calculateValueScore(metrics) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productivity Dashboard</h1>
          <p className="text-muted-foreground">
            Track your productivity metrics and insights
          </p>
        </div>

        <Select value={period} onValueChange={(val) => setPeriod(val as "week" | "month")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Composite Score Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Productivity Score</span>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className={`text-sm font-normal ${getTrendColor()}`}>
                {data.trend.percentage > 0 ? "+" : ""}
                {data.trend.percentage.toFixed(1)}% vs previous period
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(data.current.avgProductivityScore)}`}>
                {data.current.avgProductivityScore.toFixed(1)}
              </div>
              <div className="text-xl text-muted-foreground mt-2">
                {getScoreLabel(data.current.avgProductivityScore)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Scores Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          title="Activity"
          score={activityScore}
          icon={<Activity className="h-4 w-4" />}
          description="Volume and frequency"
        />
        <ScoreCard
          title="Engagement"
          score={engagementScore}
          icon={<Target className="h-4 w-4" />}
          description="Quality and depth"
        />
        <ScoreCard
          title="Efficiency"
          score={efficiencyScore}
          icon={<Zap className="h-4 w-4" />}
          description="Speed and patterns"
        />
        <ScoreCard
          title="Value"
          score={valueScore}
          icon={<Award className="h-4 w-4" />}
          description="Outcomes and impact"
        />
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Conversations"
              value={metrics?.totalConversations || 0}
              subtitle={`${metrics?.totalUserMessages || 0} user messages`}
            />
            <MetricCard
              title="Messages"
              value={metrics?.totalMessages || 0}
              subtitle={`${metrics?.avgMessagesPerConversation?.toFixed(1) || 0} per conversation`}
            />
            <MetricCard
              title="Files Processed"
              value={metrics?.totalFilesProcessed || 0}
              subtitle={`${metrics?.fileProcessingRate?.toFixed(2) || 0} per session`}
            />
            <MetricCard
              title="Active Days"
              value={metrics?.activeDays || 0}
              subtitle={`${period === "week" ? "out of 7" : "out of 30"} days`}
            />
            <MetricCard
              title="Sessions"
              value={metrics?.totalSessions || 0}
              subtitle={`${formatDuration(metrics?.avgSessionDuration || 0)} avg duration`}
            />
            <MetricCard
              title="Peak Hour"
              value={formatHour(metrics?.peakActivityHour || 0)}
              subtitle="Most active time"
            />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Breakdown</CardTitle>
              <CardDescription>Detailed activity metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <MetricRow
                  label="Avg Conversation Length"
                  value={`${metrics?.avgConversationLength?.toFixed(1) || 0} messages`}
                />
                <MetricRow
                  label="Avg Iteration Depth"
                  value={`${metrics?.avgIterationDepth?.toFixed(1) || 0} exchanges`}
                />
                <MetricRow
                  label="Complexity Score"
                  value={`${metrics?.complexityScore?.toFixed(0) || 0}/100`}
                />
                <MetricRow
                  label="Conversation Diversity"
                  value={`${metrics?.conversationDiversity?.toFixed(0) || 0}/100`}
                />
                <MetricRow
                  label="Completion Rate"
                  value={`${metrics?.conversationCompletionRate?.toFixed(1) || 0}%`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Snapshots</CardTitle>
              <CardDescription>
                {data.current.snapshots.length} days of data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.current.snapshots.slice(0, 7).map((snapshot: any) => (
                  <div
                    key={snapshot.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div>
                      <div className="font-medium">
                        {new Date(snapshot.snapshotDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {snapshot.conversationsCreated} conversations, {snapshot.messagesCreated} messages
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(snapshot.dailyProductivityScore)}`}>
                      {snapshot.dailyProductivityScore.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper components
function ScoreCard({
  title,
  score,
  icon,
  description,
}: {
  title: string;
  score: number;
  icon: React.ReactNode;
  description: string;
}) {
  const getScoreColor = (s: number) => {
    if (s >= 75) return "text-green-500";
    if (s >= 60) return "text-blue-500";
    if (s >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score.toFixed(0)}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number | string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// Helper functions
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

// Simplified score calculations (matching backend)
function calculateActivityScore(metrics: any): number {
  const conversationScore = Math.min((metrics.totalConversations / 20) * 100, 100);
  const messageScore = Math.min((metrics.totalMessages / 100) * 100, 100);
  const fileScore = Math.min((metrics.totalFilesProcessed / 10) * 100, 100);
  const activeDayScore = Math.min((metrics.activeDays / 7) * 100, 100);
  const sessionScore = Math.min((metrics.totalSessions / 15) * 100, 100);

  return (
    conversationScore * 0.3 +
    messageScore * 0.3 +
    fileScore * 0.15 +
    activeDayScore * 0.15 +
    sessionScore * 0.1
  );
}

function calculateEngagementScore(metrics: any): number {
  const lengthScore = Math.min((metrics.avgConversationLength / 5) * 100, 100);
  const depthScore = Math.min((metrics.avgIterationDepth / 3) * 100, 100);

  return (
    lengthScore * 0.3 +
    depthScore * 0.3 +
    metrics.complexityScore * 0.2 +
    metrics.conversationDiversity * 0.2
  );
}

function calculateEfficiencyScore(metrics: any): number {
  const startTimeScore = Math.max(100 - (metrics.avgTimeToFirstMessage / 300) * 100, 0);
  const responseTimeScore = Math.max(100 - (metrics.avgTimeBetweenMessages / 600) * 100, 0);

  const sessionMinutes = metrics.avgSessionDuration / 60;
  let sessionScore = 0;
  if (sessionMinutes >= 15 && sessionMinutes <= 30) {
    sessionScore = 100;
  } else if (sessionMinutes < 15) {
    sessionScore = (sessionMinutes / 15) * 100;
  } else {
    sessionScore = Math.max(100 - ((sessionMinutes - 30) / 30) * 50, 0);
  }

  return startTimeScore * 0.3 + responseTimeScore * 0.4 + sessionScore * 0.3;
}

function calculateValueScore(metrics: any): number {
  const tokenScore = Math.min((metrics.tokenEfficiency / 10) * 100, 100);
  const fileScore = Math.min(metrics.fileProcessingRate * 100, 100);
  const favoriteRate =
    metrics.totalConversations > 0
      ? (metrics.favoriteConversations / metrics.totalConversations) * 100
      : 0;
  const favoriteScore = Math.min((favoriteRate / 20) * 100, 100);

  return (
    tokenScore * 0.3 +
    metrics.conversationCompletionRate * 0.3 +
    fileScore * 0.2 +
    favoriteScore * 0.2
  );
}
