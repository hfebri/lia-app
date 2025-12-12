import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ConversationsProvider } from "@/components/providers/conversations-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { VersionMigrationProvider } from "@/components/providers/version-migration-provider";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { SessionTracker } from "@/components/analytics/session-tracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LIA",
  description: "Leverate Intelligent Assistant",
  icons: {
    icon: [
      { url: "/logo-dark.svg", sizes: "32x32", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/logo-light.svg", sizes: "32x32", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/logo-dark.svg", sizes: "16x16", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/logo-light.svg", sizes: "16x16", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
    ],
    shortcut: "/logo-dark.svg",
    apple: { url: "/logo-dark.svg", sizes: "180x180", type: "image/svg+xml" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-F19JC8LYNW"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-F19JC8LYNW');
          `}
        </Script>
        <VersionMigrationProvider>
          <ErrorBoundary>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AuthProvider>
                <SessionTracker />
                <ConversationsProvider>
                  {children}
                  <ToastProvider />
                </ConversationsProvider>
              </AuthProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </VersionMigrationProvider>
      </body>
    </html>
  );
}
