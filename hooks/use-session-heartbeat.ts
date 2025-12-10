"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";

const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds

export function useSessionHeartbeat() {
  const { isAuthenticated, isLoading } = useAuth();
  const lastHeartbeatRef = useRef<number>(0);
  const hasSetupRef = useRef(false);

  useEffect(() => {
    // Don't do anything until auth is loaded and user is authenticated
    if (isLoading || !isAuthenticated) {
      hasSetupRef.current = false;
      return;
    }

    // Send initial heartbeat when first authenticated
    if (!hasSetupRef.current) {
      sendHeartbeat();
      hasSetupRef.current = true;
    }

    // Set up interval
    const intervalId = setInterval(() => {
      // Only send if tab is visible and user is still authenticated
      if (document.visibilityState === "visible" && isAuthenticated) {
        sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);

    // Add visibility change listener to send heartbeat when user returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isAuthenticated) {
        const now = Date.now();
        // If it's been more than 1 minute since last heartbeat, send one now
        if (now - lastHeartbeatRef.current > 60 * 1000) {
          sendHeartbeat();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, isLoading]);

  const sendHeartbeat = async () => {
    try {
      await fetch("/api/user/heartbeat", {
        method: "POST",
        // Keep connection alive even if page unloads
        keepalive: true,
      });
      lastHeartbeatRef.current = Date.now();
    } catch (error) {
      // Silent failure - don't disturb the user
      console.error("[Session Heartbeat] Failed:", error);
    }
  };
}
