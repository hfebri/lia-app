import { config } from "dotenv";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

function initializeDb(url: string) {
  const client = postgres(url, {
    prepare: false,
    max: 10, // Max number of connections in the pool
    idle_timeout: 20, // Close idle connections after 20 seconds
    max_lifetime: 60 * 30, // Close connections after 30 minutes
  });
  return drizzlePostgres(client, { schema });
}

export const db = initializeDb(databaseUrl);

// Export schema for use in other parts of the application
export { schema } from "./schema";
export * from "./types";
