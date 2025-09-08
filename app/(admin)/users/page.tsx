"use client";

import { UserTable } from "@/components/admin/user-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
// Remove server action import - using API route instead
import { User } from "@/db/types";
import { toast } from "sonner";

// Convert database users to UserTable format
const convertToUserTableFormat = (
  dbUsers: (User & { messageCount: number; fileCount: number })[]
) => {
  return dbUsers.map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.name || undefined,
    avatarUrl: user.image || undefined,
    role: user.role as "admin" | "user",
    status: user.isActive ? ("active" as const) : ("inactive" as const),
    lastActive: user.updatedAt,
    createdAt: user.createdAt,
    messageCount: user.messageCount,
    fileCount: user.fileCount,
  }));
};

export default function AdminUsersPage() {
  console.log("🔍 [ADMIN USERS PAGE] Component rendered");

  const [users, setUsers] = useState<
    (User & { messageCount: number; fileCount: number })[]
  >([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);

      console.log("🔍 [FRONTEND] Fetching admin users...");
      const response = await fetch("/api/admin/users", {
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      console.log("🔍 [FRONTEND] Response status:", response.status);
      const usersResult = await response.json();
      console.log("🔍 [FRONTEND] API response:", usersResult);

      if (usersResult.isSuccess && usersResult.data) {
        console.log(
          "✅ [FRONTEND] Setting users data:",
          usersResult.data.length,
          "users"
        );
        console.log("🔍 [FRONTEND] Sample user data:", usersResult.data[0]);
        setUsers(usersResult.data);
      } else {
        console.log("❌ [FRONTEND] API failed:", usersResult.message);
        toast.error(usersResult.message);
      }
    } catch (error) {
      console.log("❌ [FRONTEND] Fetch error:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUserAction = (userId: string, action: string) => {
    // Handle view details or other actions here
  };

  return (
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
