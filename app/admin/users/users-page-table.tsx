import { getUsersWithCountsAction } from "@/actions/db/users-actions";
import { UsersTableClient } from "./users-table-client";

export async function UsersPageTable() {
  // This runs on the server and streams to client
  const usersResult = await getUsersWithCountsAction();

  if (!usersResult.isSuccess || !usersResult.data) {
    return (
      <div className="text-center text-sm text-muted-foreground p-4">
        Failed to load users
      </div>
    );
  }

  // Pass data to client component for interactivity
  return <UsersTableClient initialUsers={usersResult.data} />;
}
