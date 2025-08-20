"use server";

import { AdminGuard } from "@/components/auth/admin-guard";
import { UserTable, mockUsers } from "@/components/admin/user-table";
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

// Mock user stats
const userStats = [
  {
    title: "Total Users",
    value: "2,543",
    change: { value: 12, type: "increase" as const, period: "last month" },
    icon: Users,
    description: "All registered users",
  },
  {
    title: "Active Today",
    value: "892",
    change: { value: 7, type: "increase" as const, period: "yesterday" },
    icon: Activity,
    description: "Users active in last 24h",
  },
  {
    title: "New Registrations",
    value: "156",
    change: { value: 23, type: "increase" as const, period: "last week" },
    icon: TrendingUp,
    description: "New users this week",
  },
  {
    title: "Admin Users",
    value: "12",
    icon: Shield,
    description: "Users with admin privileges",
  },
];

export default async function AdminUsersPage() {
  const handleUserAction = (userId: string, action: string) => {
    console.log(`Action ${action} on user ${userId}`);
    // Here you would implement the actual user action logic
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
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
        <AdminStats stats={userStats} />

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
            <UserTable users={mockUsers} onUserAction={handleUserAction} />
          </CardContent>
        </Card>

        {/* Recent User Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Recent User Activity</span>
              </CardTitle>
              <CardDescription>Latest user actions and events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">User Registration</p>
                    <p className="text-xs text-muted-foreground">
                      john.doe@example.com
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    2 minutes ago
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Password Reset</p>
                    <p className="text-xs text-muted-foreground">
                      jane.smith@example.com
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    5 minutes ago
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Profile Updated</p>
                    <p className="text-xs text-muted-foreground">
                      alice.johnson@example.com
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    10 minutes ago
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Role Changed</p>
                    <p className="text-xs text-muted-foreground">
                      bob.wilson@example.com
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    15 minutes ago
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>User Roles & Permissions</span>
              </CardTitle>
              <CardDescription>
                Role distribution and access levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Super Admin</span>
                  </div>
                  <span className="text-sm text-muted-foreground">2 users</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Admin</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    10 users
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">User</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    2,531 users
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-sm font-medium">Suspended</span>
                  </div>
                  <span className="text-sm text-muted-foreground">0 users</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
