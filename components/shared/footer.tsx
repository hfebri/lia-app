"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";

export function Footer() {
  const { theme } = useTheme();
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 md:h-16 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <div className="flex items-center space-x-2">
            <Image
              src={theme === "dark" ? "/logo-dark.svg" : "/logo-light.svg"}
              alt="LIA Logo"
              width={16}
              height={16}
            />
            <span className="font-bold">LIA</span>
            <Badge variant="secondary" className="ml-2">Beta</Badge>
          </div>
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Powered by Leverate Group.
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms of Service
          </Link>
          <Link
            href="/support"
            className="underline underline-offset-4 hover:text-primary"
          >
            Support
          </Link>
        </div>
      </div>
    </footer>
  );
}
