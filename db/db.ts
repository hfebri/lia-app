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
  const client = postgres(url, { prepare: false });
  return drizzlePostgres(client, { schema });
}

export const db = initializeDb(databaseUrl);

// Export schema for use in other parts of the application
export { schema } from "./schema";
export * from "./types";
