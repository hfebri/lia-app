"use server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  FileText,
  Users,
  TrendingUp,
  Clock,
  Zap,
  Target,
  Plus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { ActivityChart } from "./activity-chart";
import { RecentConversations } from "./recent-conversations";
import { FileAnalytics } from "./file-analytics";

export async function DashboardOverview() {
  // Mock data - in real app this would come from actual analytics
  const stats = {
    totalConversations: 24,
    totalMessages: 847,
    filesProcessed: 12,
    averageResponseTime: "1.2s",
  };

  const trends = {
    conversations: "+23%",
    messages: "+18%",
    files: "+45%",
    responseTime: "-12%",
  };

  return (
    <div className="grid gap-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{trends.conversations}</span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Messages Exchanged
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{trends.messages}</span> from
              last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Files Processed
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.filesProcessed}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{trends.files}</span> from last
              month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageResponseTime}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{trends.responseTime}</span> from
              last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button asChild className="h-auto flex-col gap-2 p-6">
              <Link href="/chat">
                <MessageSquare className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Start New Chat</div>
                  <div className="text-sm text-muted-foreground">
                    Begin a conversation with AI
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto flex-col gap-2 p-6"
            >
              <Link href="/chat">
                <FileText className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Upload & Analyze</div>
                  <div className="text-sm text-muted-foreground">
                    Process documents with AI
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto flex-col gap-2 p-6"
            >
              <Link href="/chat">
                <TrendingUp className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">View Analytics</div>
                  <div className="text-sm text-muted-foreground">
                    Check usage patterns
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Activity Overview
            </CardTitle>
            <CardDescription>
              Your usage patterns over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              File Analytics
            </CardTitle>
            <CardDescription>Document processing insights</CardDescription>
          </CardHeader>
          <CardContent>
            <FileAnalytics />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Conversations
          </CardTitle>
          <CardDescription>Your latest AI interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentConversations />
        </CardContent>
      </Card>
    </div>
  );
}
