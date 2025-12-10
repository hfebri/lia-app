"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Minus, Activity, Target, Zap, Award, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ProductivityMetricsTabProps {
  userId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function ProductivityMetricsTab({ userId, dateRange }: ProductivityMetricsTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (dateRange?.from && dateRange?.to) {
        params.append("startDate", dateRange.from.toISOString());
        params.append("endDate", dateRange.to.toISOString());
      } else {
        // Default period
        params.append("period", "week");
      }

      // Add user filter if specified (for admin filtering)
      if (userId) {
        params.append("userId", userId);
      }

      const response = await fetch(`/api/productivity/dashboard?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch productivity data");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    try {
      setCalculating(true);
      const response = await fetch("/api/productivity/calculate", {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to calculate metrics");
      }

      // Refresh data after calculation
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, dateRange]);

  if (loading) {
    return <ProductivitySkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load productivity metrics: {error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
          <CardDescription>
            No productivity data has been calculated yet. Click the button below to calculate metrics from your activity history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCalculate} disabled={calculating}>
            {calculating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              "Calculate Metrics"
            )}
          </Button>
        </CardContent>
      </Card>
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
    <div className="space-y-6">
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Active Days"
          value={metrics?.activeDays || 0}
          subtitle="Days with activity"
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
        <MetricCard
          title="Avg Messages/Conversation"
          value={metrics?.avgMessagesPerConversation?.toFixed(1) || 0}
          subtitle="Conversation depth"
        />
        <MetricCard
          title="File Processing Rate"
          value={metrics?.fileProcessingRate?.toFixed(2) || 0}
          subtitle="Files per session"
        />
        <MetricCard
          title="Token Efficiency"
          value={metrics?.tokenEfficiency?.toFixed(1) || 0}
          subtitle="Tokens per message"
        />
      </div>
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

// Skeleton loader component
function ProductivitySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Composite Score Card Skeleton */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="h-20 w-32 bg-muted rounded mx-auto mb-4" />
              <div className="h-6 w-24 bg-muted rounded mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Scores Grid Skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Metrics Skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted rounded mb-2" />
              <div className="h-3 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
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
