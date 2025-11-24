"use client";

import { useSessionHeartbeat } from "@/hooks/use-session-heartbeat";

export function SessionTracker() {
  useSessionHeartbeat();
  return null;
}
