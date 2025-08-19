"use client";

import { useState, useCallback } from "react";
import { useAuth } from "./use-auth";
import type { User } from "../db/types";

interface UseUserOptions {
  onSuccess?: (user: User) => void;
  onError?: (error: Error) => void;
}

export function useUser(options: UseUserOptions = {}) {
  const { user, refreshSession } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update user profile
  const updateProfile = useCallback(
    async (updates: {
      name?: string;
      image?: string;
    }): Promise<User | null> => {
      if (!user?.id) {
        throw new Error("No authenticated user");
      }

      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update profile");
        }

        const updatedUser = await response.json();

        // Refresh the session to get updated user data
        await refreshSession();

        options.onSuccess?.(updatedUser);
        return updatedUser;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Update failed");
        setError(error.message);
        options.onError?.(error);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [user?.id, refreshSession, options]
  );

  // Change user role (admin only)
  const changeRole = useCallback(
    async (userId: string, newRole: "user" | "admin"): Promise<User | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to change role");
        }

        const updatedUser = await response.json();
        options.onSuccess?.(updatedUser);
        return updatedUser;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Role change failed");
        setError(error.message);
        options.onError?.(error);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [options]
  );

  // Deactivate user (admin only)
  const deactivateUser = useCallback(
    async (userId: string): Promise<User | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
          method: "PATCH",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to deactivate user");
        }

        const updatedUser = await response.json();
        options.onSuccess?.(updatedUser);
        return updatedUser;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Deactivation failed");
        setError(error.message);
        options.onError?.(error);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [options]
  );

  // Reactivate user (admin only)
  const reactivateUser = useCallback(
    async (userId: string): Promise<User | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/users/${userId}/reactivate`, {
          method: "PATCH",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to reactivate user");
        }

        const updatedUser = await response.json();
        options.onSuccess?.(updatedUser);
        return updatedUser;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Reactivation failed");
        setError(error.message);
        options.onError?.(error);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [options]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Current user
    user,

    // State
    isUpdating,
    error,

    // Actions
    updateProfile,
    changeRole,
    deactivateUser,
    reactivateUser,
    clearError,

    // Helpers
    isOwnProfile: (userId: string) => user?.id === userId,
  };
}
