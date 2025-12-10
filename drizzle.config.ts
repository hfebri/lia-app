import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { redirect } from "next/dist/server/api-utils";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
