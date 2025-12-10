import { getUserStatsAction } from "@/actions/db/users-actions";
import { StatsClient } from "./stats-client";

export async function UsersPageStats() {
  // This runs on the server and streams to client
  const statsResult = await getUserStatsAction();

  if (!statsResult.isSuccess || !statsResult.data) {
    return (
      <div className="text-center text-sm text-muted-foreground p-4">
        Failed to load statistics
      </div>
    );
  }

  // Pass only serializable data to client component
  return <StatsClient stats={statsResult.data} />;
}
