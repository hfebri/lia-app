"use client";

import { useEffect } from "react";
import { migrateVersion } from "@/lib/utils/version-migration";

/**
 * Version Migration Provider
 *
 * Runs version migration on app load to handle users
 * who accessed previous versions with different cache structures
 */
export function VersionMigrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Run migration on mount
    migrateVersion();
  }, []);

  return <>{children}</>;
}
