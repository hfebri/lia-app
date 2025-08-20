"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Responsive breakpoints
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Hook to detect screen size
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
    breakpoint: Breakpoint;
  }>({
    width: 0,
    height: 0,
    breakpoint: "sm",
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      let breakpoint: Breakpoint = "sm";
      if (width >= breakpoints["2xl"]) breakpoint = "2xl";
      else if (width >= breakpoints.xl) breakpoint = "xl";
      else if (width >= breakpoints.lg) breakpoint = "lg";
      else if (width >= breakpoints.md) breakpoint = "md";

      setScreenSize({ width, height, breakpoint });
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  return screenSize;
}

// Hook to detect if we're on mobile
export function useIsMobile() {
  const { breakpoint } = useScreenSize();
  return breakpoint === "sm";
}

// Container component with responsive padding and max-width
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = "2xl",
  padding = "md",
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  const paddingClasses = {
    none: "",
    sm: "px-2 sm:px-4",
    md: "px-4 sm:px-6 lg:px-8",
    lg: "px-6 sm:px-8 lg:px-12",
  };

  return (
    <div
      className={cn(
        "w-full mx-auto",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

// Grid component with responsive columns
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: "none" | "sm" | "md" | "lg" | "xl";
}

export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, md: 2, lg: 3 },
  gap = "md",
}: ResponsiveGridProps) {
  const gapClasses = {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
  };

  const getColClasses = () => {
    const classes = [`grid-cols-${cols.default}`];
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    return classes.join(" ");
  };

  return (
    <div className={cn("grid", getColClasses(), gapClasses[gap], className)}>
      {children}
    </div>
  );
}

// Responsive text component
interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  size?: {
    default: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
    sm?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
    md?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
    lg?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  };
  weight?: "normal" | "medium" | "semibold" | "bold";
  element?: "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span";
}

export function ResponsiveText({
  children,
  className,
  size = { default: "base" },
  weight = "normal",
  element: Element = "p",
}: ResponsiveTextProps) {
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
  };

  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  const getSizeClasses = () => {
    const classes = [sizeClasses[size.default]];
    if (size.sm) classes.push(`sm:${sizeClasses[size.sm]}`);
    if (size.md) classes.push(`md:${sizeClasses[size.md]}`);
    if (size.lg) classes.push(`lg:${sizeClasses[size.lg]}`);
    return classes.join(" ");
  };

  return (
    <Element className={cn(getSizeClasses(), weightClasses[weight], className)}>
      {children}
    </Element>
  );
}

// Responsive spacing component
interface ResponsiveSpacingProps {
  children: React.ReactNode;
  className?: string;
  space?: {
    default: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    sm?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    md?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    lg?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  };
  direction?: "x" | "y" | "all";
}

export function ResponsiveSpacing({
  children,
  className,
  space = { default: "md" },
  direction = "all",
}: ResponsiveSpacingProps) {
  const spaceClasses = {
    none: "0",
    xs: "1",
    sm: "2",
    md: "4",
    lg: "6",
    xl: "8",
    "2xl": "12",
  };

  const directionPrefixes = {
    x: "px-",
    y: "py-",
    all: "p-",
  };

  const getSpaceClasses = () => {
    const prefix = directionPrefixes[direction];
    const classes = [`${prefix}${spaceClasses[space.default]}`];
    if (space.sm) classes.push(`sm:${prefix}${spaceClasses[space.sm]}`);
    if (space.md) classes.push(`md:${prefix}${spaceClasses[space.md]}`);
    if (space.lg) classes.push(`lg:${prefix}${spaceClasses[space.lg]}`);
    return classes.join(" ");
  };

  return <div className={cn(getSpaceClasses(), className)}>{children}</div>;
}

// Mobile-first stack component
interface MobileStackProps {
  children: React.ReactNode;
  className?: string;
  breakpoint?: Breakpoint;
  space?: "sm" | "md" | "lg";
  reverse?: boolean;
}

export function MobileStack({
  children,
  className,
  breakpoint = "md",
  space = "md",
  reverse = false,
}: MobileStackProps) {
  const spaceClasses = {
    sm: "space-y-2",
    md: "space-y-4",
    lg: "space-y-6",
  };

  const flexDirection = reverse ? "flex-col-reverse" : "flex-col";
  const breakpointClass = `${breakpoint}:flex-row`;
  const breakpointSpace = `${breakpoint}:space-y-0 ${breakpoint}:space-x-${
    space === "sm" ? "2" : space === "md" ? "4" : "6"
  }`;

  return (
    <div
      className={cn(
        "flex",
        flexDirection,
        spaceClasses[space],
        breakpointClass,
        breakpointSpace,
        className
      )}
    >
      {children}
    </div>
  );
}

// Hide/show on different screen sizes
interface ResponsiveVisibilityProps {
  children: React.ReactNode;
  hide?: Breakpoint[];
  show?: Breakpoint[];
  className?: string;
}

export function ResponsiveVisibility({
  children,
  hide = [],
  show = [],
  className,
}: ResponsiveVisibilityProps) {
  const hideClasses = hide.map((bp) => `${bp}:hidden`).join(" ");
  const showClasses = show.map((bp) => `${bp}:block`).join(" ");

  return (
    <div className={cn(hideClasses, showClasses, className)}>{children}</div>
  );
}
