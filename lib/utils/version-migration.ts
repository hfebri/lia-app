/**
 * Version Migration Utility
 *
 * Handles version migrations for localStorage/sessionStorage data
 * to ensure users who accessed previous versions get proper cache invalidation
 */

const APP_VERSION = "1.0.1"; // Increment this when cache structure changes
const VERSION_KEY = "lia-app-version";

// Keys to clear when version changes
const CACHE_KEYS_TO_CLEAR = [
  "lia-user-cache",
  "file_context_analytics",
  "lia-selected-model", // Model selection cache
  "lia-conversation-cache", // Any conversation cache
];

/**
 * Check and migrate user data if version has changed
 */
export function migrateVersion(): void {
  if (typeof window === "undefined") return;

  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);

    // If version doesn't match, clear all caches
    if (storedVersion !== APP_VERSION) {
      // Clear localStorage caches
      CACHE_KEYS_TO_CLEAR.forEach((key) => {
        localStorage.removeItem(key);
      });

      // Clear sessionStorage (file context analytics)
      sessionStorage.clear();

      // Update version
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  } catch (error) {
    console.error("[Version Migration] Failed to migrate:", error);
  }
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
  return APP_VERSION;
}

/**
 * Force clear all caches (useful for debugging)
 */
export function clearAllCaches(): void {
  if (typeof window === "undefined") return;

  try {
    CACHE_KEYS_TO_CLEAR.forEach((key) => {
      localStorage.removeItem(key);
    });
    sessionStorage.clear();
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  } catch (error) {
    console.error("[Version Migration] Failed to clear caches:", error);
  }
}
