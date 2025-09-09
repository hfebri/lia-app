import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminStats, defaultAdminStats } from "@/components/admin/admin-stats";
import {
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Clock,
  Shield,
} from "lucide-react";
import Link from "next/link";

// removed unused stats variable

const recentActivity = [
  {
    id: 1,
    type: "user_registered",
    message: "New user registration",
    user: "john.doe@example.com",
    timestamp: "2 minutes ago",
  },
  {
    id: 2,
    type: "file_uploaded",
    message: "File uploaded for analysis",
    user: "jane.smith@example.com",
    timestamp: "5 minutes ago",
  },
  {
    id: 3,
    type: "conversation_started",
    message: "New conversation started",
    user: "alice.johnson@example.com",
    timestamp: "10 minutes ago",
  },
  {
    id: 4,
    type: "admin_action",
    message: "User role updated",
    user: "admin@example.com",
    timestamp: "15 minutes ago",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground">
            Monitor and manage your AI platform
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <AdminStats stats={defaultAdminStats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Latest actions and events on the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between space-x-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.message}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.user}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge variant="outline" className="text-xs">
                    {activity.type.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>System Status</span>
            </CardTitle>
            <CardDescription>
              Current system health and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Response Time</span>
                <Badge variant="default">145ms</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database Status</span>
                <Badge variant="default" className="bg-green-500">
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Model Status</span>
                <Badge variant="default" className="bg-green-500">
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Storage Usage</span>
                <Badge variant="secondary">68%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Sessions</span>
                <Badge variant="outline">234</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/users">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-center p-6">
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="font-medium">Manage Users</p>
                    <p className="text-sm text-muted-foreground">
                      View and edit user accounts
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/analytics">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-center p-6">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="font-medium">View Analytics</p>
                    <p className="text-sm text-muted-foreground">
                      Platform usage statistics
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/content">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-center p-6">
                  <div className="text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="font-medium">Content Management</p>
                    <p className="text-sm text-muted-foreground">
                      Manage conversations and files
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
