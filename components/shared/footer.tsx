import Link from "next/link";
import { Bot } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 md:h-16 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <div className="flex items-center space-x-2">
            <Bot className="h-4 w-4" />
            <span className="font-bold">LIA</span>
          </div>
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            AI Platform powered by AI Model API.
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
