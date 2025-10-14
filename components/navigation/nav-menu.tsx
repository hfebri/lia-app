"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useNavigationLoader } from "@/components/providers/navigation-loader-provider";

interface NavMenuItem {
  title: string;
  href: string;
  description?: string;
  external?: boolean;
  badge?: string;
}

interface NavMenuSection {
  title: string;
  items: NavMenuItem[];
}

interface NavMenuProps {
  sections: NavMenuSection[];
  className?: string;
}

export function NavMenu({ sections, className }: NavMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNavigation } = useNavigationLoader();
  const currentSearch = searchParams.toString();
  const currentLocation = currentSearch ? `${pathname}?${currentSearch}` : pathname;

  const handleLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    isExternal: boolean
  ) => {
    if (
      isExternal ||
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0
    ) {
      return;
    }

    if (href === currentLocation) {
      return;
    }

    startNavigation();
  };

  return (
    <nav className={cn("flex items-center space-x-6", className)}>
      {sections.map((section) => (
        <DropdownMenu key={section.title}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto p-2">
              {section.title}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {section.items.map((item, index) => {
              const isActive = pathname === item.href;
              const isExternal = item.external || item.href.startsWith("http");

              return (
                <div key={item.href}>
                  <DropdownMenuItem asChild>
                    <Link
                      href={item.href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      onClick={(event) =>
                        handleLinkClick(event, item.href, isExternal)
                      }
                      className={cn(
                        "flex items-center justify-between w-full",
                        isActive && "bg-accent"
                      )}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span>{item.title}</span>
                          {isExternal && (
                            <ExternalLink className="ml-1 h-3 w-3" />
                          )}
                        </div>
                        {item.description && (
                          <span className="text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                      </div>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-2">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  {index < section.items.length - 1 && (
                    <DropdownMenuSeparator />
                  )}
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </nav>
  );
}

// Predefined navigation sections
export const defaultNavSections: NavMenuSection[] = [
  {
    title: "Features",
    items: [
      {
        title: "Chat Interface",
        href: "/chat",
        description: "AI-powered conversations",
      },
    ],
  },
  {
    title: "Resources",
    items: [
      {
        title: "Documentation",
        href: "/docs",
        description: "Learn how to use the platform",
      },
      {
        title: "Developer Resources",
        href: "/api-docs",
        description: "Developer documentation and resources",
        external: true,
      },
      {
        title: "Support",
        href: "/support",
        description: "Get help and contact us",
      },
    ],
  },
];

// Breadcrumb navigation
interface BreadcrumbItem {
  title: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      className={cn(
        "flex items-center space-x-1 text-sm text-muted-foreground",
        className
      )}
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <span className="mx-2">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.title}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.title}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
