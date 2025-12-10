"use client";

import { AdminStats } from "@/components/admin/admin-stats";
import { Users, Shield, Activity, TrendingUp } from "lucide-react";

interface StatsClientProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    newRegistrations: number;
    adminUsers: number;
    totalConversations: number;
    totalMessages: number;
    totalFiles: number;
  };
}

export function StatsClient({ stats }: StatsClientProps) {
  // Format stats with icons (client-side only)
  const formattedStats = [
    {
      title: "Total Users",
      value: stats.totalUsers.toString(),
      change: {
        value: 12,
        type: "increase" as const,
        period: "last month",
      },
      icon: Users,
      description: "All registered users",
    },
    {
      title: "Active Today",
      value: stats.activeUsers.toString(),
      change: {
        value: 7,
        type: "increase" as const,
        period: "yesterday",
      },
      icon: Activity,
      description: "Users active in last 24h",
    },
    {
      title: "New Registrations",
      value: stats.newRegistrations.toString(),
      change: {
        value: 23,
        type: "increase" as const,
        period: "last week",
      },
      icon: TrendingUp,
      description: "New users this week",
    },
    {
      title: "Admin Users",
      value: stats.adminUsers.toString(),
      icon: Shield,
      description: "Users with admin privileges",
    },
  ];

  return <AdminStats stats={formattedStats} />;
}
