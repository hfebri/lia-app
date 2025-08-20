"use client";

import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Circle } from "lucide-react";

export interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "dots" | "pulse" | "bounce" | "spin" | "bars";
  className?: string;
  text?: string;
  color?: "primary" | "secondary" | "muted" | "accent";
}

const sizeMap = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
} as const;

const colorMap = {
  primary: "text-primary",
  secondary: "text-secondary",
  muted: "text-muted-foreground",
  accent: "text-accent-foreground",
} as const;

export function LoadingSpinner({
  size = "md",
  variant = "default",
  className,
  text,
  color = "primary",
}: LoadingSpinnerProps) {
  const sizeClass = sizeMap[size];
  const colorClass = colorMap[color];

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        <div
          className={cn(
            "rounded-full animate-bounce",
            sizeClass,
            colorClass,
            "bg-current"
          )}
        />
        <div
          className={cn(
            "rounded-full animate-bounce delay-75",
            sizeClass,
            colorClass,
            "bg-current"
          )}
        />
        <div
          className={cn(
            "rounded-full animate-bounce delay-150",
            sizeClass,
            colorClass,
            "bg-current"
          )}
        />
        {text && (
          <span className="ml-2 text-sm text-muted-foreground">{text}</span>
        )}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div
          className={cn(
            "rounded-full animate-pulse",
            sizeClass,
            colorClass,
            "bg-current"
          )}
        />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  if (variant === "bounce") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className={cn("flex space-x-1", colorClass)}>
          <Circle className={cn("animate-bounce", sizeClass)} />
          <Circle className={cn("animate-bounce delay-75", sizeClass)} />
          <Circle className={cn("animate-bounce delay-150", sizeClass)} />
        </div>
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  if (variant === "bars") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className={cn("flex items-end space-x-1", colorClass)}>
          <div
            className={cn(
              "w-1 bg-current animate-pulse",
              size === "xs"
                ? "h-2"
                : size === "sm"
                ? "h-3"
                : size === "md"
                ? "h-4"
                : size === "lg"
                ? "h-6"
                : "h-8"
            )}
          />
          <div
            className={cn(
              "w-1 bg-current animate-pulse delay-75",
              size === "xs"
                ? "h-3"
                : size === "sm"
                ? "h-4"
                : size === "md"
                ? "h-6"
                : size === "lg"
                ? "h-8"
                : "h-10"
            )}
          />
          <div
            className={cn(
              "w-1 bg-current animate-pulse delay-150",
              size === "xs"
                ? "h-2"
                : size === "sm"
                ? "h-3"
                : size === "md"
                ? "h-4"
                : size === "lg"
                ? "h-6"
                : "h-8"
            )}
          />
        </div>
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  if (variant === "spin") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <RefreshCw className={cn("animate-spin", sizeClass, colorClass)} />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClass, colorClass)} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

// Overlay loader component
export interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  variant?: LoadingSpinnerProps["variant"];
  className?: string;
  backdrop?: boolean;
}

export function LoadingOverlay({
  isLoading,
  children,
  text = "Loading...",
  variant = "default",
  className,
  backdrop = true,
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center z-50",
            backdrop && "bg-background/80 backdrop-blur-sm"
          )}
        >
          <div className="flex flex-col items-center space-y-2">
            <LoadingSpinner variant={variant} size="lg" />
            {text && (
              <p className="text-sm text-muted-foreground font-medium">
                {text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Page loader component
export interface PageLoaderProps {
  text?: string;
  variant?: LoadingSpinnerProps["variant"];
  fullScreen?: boolean;
  className?: string;
}

export function PageLoader({
  text = "Loading...",
  variant = "default",
  fullScreen = true,
  className,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        fullScreen ? "min-h-screen" : "min-h-[400px]",
        className
      )}
    >
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner variant={variant} size="xl" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">{text}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Please wait while we load your content
          </p>
        </div>
      </div>
    </div>
  );
}

// Button loader component
export interface ButtonLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  variant?: "default" | "dots";
  size?: "sm" | "md";
  className?: string;
}

export function ButtonLoader({
  isLoading,
  children,
  loadingText,
  variant = "default",
  size = "sm",
  className,
}: ButtonLoaderProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <LoadingSpinner
        variant={variant === "dots" ? "dots" : "default"}
        size={size === "sm" ? "xs" : "sm"}
      />
      {loadingText && <span>{loadingText}</span>}
    </div>
  );
}

// Skeleton loader components
export interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted rounded-md",
        animate && "animate-pulse",
        className
      )}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 border rounded-lg space-y-4", className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8" />
          ))}
        </div>
      ))}
    </div>
  );
}
