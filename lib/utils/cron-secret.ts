import { createHash } from "crypto";

/**
 * Generate a deterministic CRON_SECRET based on existing environment variables.
 * This avoids needing to manually set CRON_SECRET in the environment.
 *
 * The secret is derived from DATABASE_URL which is:
 * 1. Always present in the environment
 * 2. Unique per deployment
 * 3. Stable across function invocations
 */
export function getCronSecret(): string {
  // Use DATABASE_URL as the seed since it's always present and unique
  const seed = process.env.DATABASE_URL || process.env.SUPABASE_URL;

  if (!seed) {
    throw new Error("Cannot generate cron secret: DATABASE_URL or SUPABASE_URL not found");
  }

  // Create a deterministic hash
  const hash = createHash("sha256")
    .update(seed)
    .update("cron-secret-v1") // Salt to make it unique
    .digest("hex");

  // Return a portion of the hash (32 chars is plenty for security)
  return hash.substring(0, 32);
}
