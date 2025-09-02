"use client";

import { UserTable } from "@/components/admin/user-table";
import { AdminStats } from "@/components/admin/admin-stats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  Shield,
  Activity,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getUsersAction, getUserStatsAction } from "@/actions/db/users-actions";
import { SelectUser } from "@/db/schema";
import { toast } from "sonner";

// Convert database users to UserTable format
const convertToUserTableFormat = (dbUsers: SelectUser[]) => {
  return dbUsers.map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.name || undefined,
    avatarUrl: user.image || undefined,
    role: user.role as "admin" | "user",
    status: "active" as const, // You might want to add this to your schema
    lastActive: user.updatedAt,
    createdAt: user.createdAt,
    messageCount: 0, // You'll need to join with messages to get real counts
    fileCount: 0, // You'll need to join with files to get real counts
  }));
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SelectUser[]>([]);
  const [userStats, setUserStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResult, statsResult] = await Promise.all([
        getUsersAction(),
        getUserStatsAction(),
      ]);

      if (usersResult.isSuccess && usersResult.data) {
        setUsers(usersResult.data);
      } else {
        toast.error(usersResult.message);
      }

      if (statsResult.isSuccess && statsResult.data) {
        const stats = statsResult.data;
        setUserStats([
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
        ]);
      } else {
        toast.error(statsResult.message);
      }
    } catch (error) {
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUserAction = (userId: string, action: string) => {
    console.log(`Action ${action} on user ${userId}`);
    // Handle view details or other actions here
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              User Management
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* User Statistics */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <AdminStats stats={userStats} />
      )}

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>All Users</span>
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserTable
            users={convertToUserTableFormat(users)}
            onUserAction={handleUserAction}
            onRefresh={loadData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
