"use client";

import { UserTable } from "@/components/admin/user-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/db/types";

// Convert database users to UserTable format
// Note: UserTable displays messageCount as "conversations" and fileCount as "messages"
// So we map: conversationCount → messageCount, messageCount → fileCount
const convertToUserTableFormat = (
  dbUsers: (User & { conversationCount: number; messageCount: number; fileCount: number })[]
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
    messageCount: user.conversationCount, // UserTable shows this as "conversations"
    fileCount: user.messageCount, // UserTable shows this as "messages"
  }));
};

interface UsersTableClientProps {
  initialUsers: (User & { conversationCount: number; messageCount: number; fileCount: number })[];
}

export function UsersTableClient({ initialUsers }: UsersTableClientProps) {
  const router = useRouter();

  const handleRefresh = () => {
    // Trigger server re-fetch by refreshing the route
    router.refresh();
  };

  const handleUserAction = () => {
    // Handle view details or other actions here
  };

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>All Users</span>
        </CardTitle>
        <CardDescription>
          Manage user accounts, roles, and access permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <UserTable
          users={convertToUserTableFormat(initialUsers)}
          onUserAction={handleUserAction}
          onRefresh={handleRefresh}
          isLoading={false}
        />
      </CardContent>
    </Card>
  );
}
