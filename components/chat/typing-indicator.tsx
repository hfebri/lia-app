"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
  status?:
    | "thinking"
    | "processing"
    | "searching"
    | "analyzing"
    | "generating"
    | "reading"
    | "finalizing"
    | "preparing"
    | "processing-files"
    | "scanning-images";
  isProcessingFiles?: boolean;
}

const STATUS_MESSAGES = {
  thinking: "Noted ya, aku lagi mikir dulu biar stay on brief...",
  processing: "Aku lagi prosesin datanya, nanti aku jump in lagi...",
  reading: "Hold on, aku mau tap in baca materinya dulu...",
  searching: "Sebentar, aku lagi tap in hunting insight yang relevan...",
  analyzing: "Aku lagi breaking down angkanya biar nggak miss...",
  preparing: "Jawabannya aku draft dulu biar ready di-share...",
  generating: "Aku lagi ngetik versi yang cakep, bentar lagi drop...",
  finalizing: "Almost done, aku polish dulu baru aku share...",
  "processing-files": "Aku lagi scan file-nya dulu ya, stay tuned...",
  "scanning-images": "Aku lagi baca image-nya, bentar ya nge-extract info...",
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

const FILE_PROCESSING_CYCLE = [
  "processing-files",
  "scanning-images",
  "reading",
  "analyzing",
  "preparing",
] as const;

export function TypingIndicator({
  className,
  status,
  isProcessingFiles,
}: TypingIndicatorProps) {
  const [cycleIndex, setCycleIndex] = useState(0);

  // Always cycle through statuses during a single session
  useEffect(() => {
    // Choose the appropriate cycle based on whether we're processing files
    const cycle = isProcessingFiles ? FILE_PROCESSING_CYCLE : STATUS_CYCLE;

    // Start with the provided status or first in cycle
    if (status) {
      const startIndex = cycle.indexOf(status as any);
      if (startIndex !== -1) {
        setCycleIndex(startIndex);
      }
    }

    // Cycle through messages every 2.5 seconds
    const interval = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % cycle.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isProcessingFiles, status]); // Cycle changes based on processing state

  // Get current status from the appropriate cycle
  const cycle = isProcessingFiles ? FILE_PROCESSING_CYCLE : STATUS_CYCLE;
  const currentStatus = cycle[cycleIndex];

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
