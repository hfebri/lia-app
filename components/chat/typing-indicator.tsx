"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
  status?: "thinking" | "processing" | "searching" | "analyzing" | "generating" | "reading" | "finalizing" | "preparing";
}

const STATUS_MESSAGES = {
  thinking: "Noted ya, aku lagi mikir dulu biar stay on brief.",
  processing: "Aku lagi prosesin datanya, nanti aku jump in lagi.",
  reading: "Hold on, aku mau tap in baca materinya dulu.",
  searching: "Sebentar, aku lagi tap in hunting insight yang relevan.",
  analyzing: "Aku lagi breaking down angkanya biar nggak miss.",
  preparing: "Jawabannya aku draft dulu biar ready di-share.",
  generating: "Aku lagi ngetik versi yang cakep, bentar lagi drop.",
  finalizing: "Almost done, aku polish dulu baru aku share.",
};

const STATUS_CYCLE = [
  "thinking",
  "reading",
  "processing",
  "searching",
  "analyzing",
  "preparing",
  "generating",
  "finalizing",
] as const;

export function TypingIndicator({ className, status }: TypingIndicatorProps) {
  const [cycleIndex, setCycleIndex] = useState(0);

  // Always cycle through statuses during a single session
  useEffect(() => {
    // Start with the provided status or first in cycle
    if (status) {
      const startIndex = STATUS_CYCLE.indexOf(status);
      if (startIndex !== -1) {
        setCycleIndex(startIndex);
      }
    }

    // Cycle through messages every 2.5 seconds
    const interval = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % STATUS_CYCLE.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []); // Empty deps - cycles continuously during the component lifetime

  const currentStatus = STATUS_CYCLE[cycleIndex];

  return (
    <div className={cn("flex items-center gap-3 p-4", className)}>
      {/* Loading GIF */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        <Image
          src="/loading-white.gif"
          alt="Loading"
          width={32}
          height={32}
          className="dark:invert-0 invert"
          unoptimized
        />
      </div>

      {/* Status Text */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground animate-pulse">
          {STATUS_MESSAGES[currentStatus]}
        </span>
      </div>
    </div>
  );
}
