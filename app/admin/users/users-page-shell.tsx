import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";

interface UsersPageShellProps {
  children: React.ReactNode;
}

export function UsersPageShell({ children }: UsersPageShellProps) {
  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* Header - renders immediately */}
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

      {/* Content streams in via Suspense boundaries */}
      {children}
    </div>
  );
}
