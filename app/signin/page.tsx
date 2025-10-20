"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { LoginButton } from "@/components/auth/login-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "motion/react";

export default function SignInPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to home if already authenticated
  useEffect(() => {
    console.log("[SIGNIN] 📊 Auth state:", {
      isLoading,
      isAuthenticated,
    });

    if (!isLoading && isAuthenticated) {
      console.log("[SIGNIN] ✅ User already authenticated - redirecting to /");
      router.push("/");
    } else if (!isLoading && !isAuthenticated) {
      console.log("[SIGNIN] 👤 Not authenticated - showing sign in page");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.gif')" }}
      />

      {/* Dark overlay for better text readability */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40 dark:from-black/60 dark:via-black/50 dark:to-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/15 backdrop-blur-[10px] backdrop-saturate-[180%] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition duration-700 hover:shadow-[0_8px_12px_rgba(0,0,0,0.15)]">
            <CardHeader className="relative space-y-7 pb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black">
                <Image
                  alt="LIA logo"
                  src="/loading-white.gif"
                  height={32}
                  width={32}
                  className="h-8 w-auto"
                  priority
                  unoptimized
                />
              </div>

              <div className="space-y-3">
                <CardTitle className="text-3xl font-semibold text-white">
                  LIA is ready when you are
                </CardTitle>
                <CardDescription className="text-base text-white/90">
                  Bring calm to busy deal days, spark sharper conversations, and
                  move forward with confidence.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-8">
              <div className="grid gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <motion.div
                  className="flex items-center gap-3 text-sm text-white/90"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 font-semibold text-white">
                    1
                  </span>
                  Turn long decks and document stacks into quick, human chats.
                </motion.div>
                <motion.div
                  className="flex items-center gap-3 text-sm text-white/90"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 font-semibold text-white">
                    2
                  </span>
                  Keep every insight private with controls that stay on your
                  side.
                </motion.div>
                <motion.div
                  className="flex items-center gap-3 text-sm text-white/90"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 font-semibold text-white">
                    3
                  </span>
                  Stay in sync with a workspace shaped for Leverate teams.
                </motion.div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LoginButton
                  className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-6 py-3 text-base font-semibold text-white shadow-[0_25px_55px_-25px_rgba(56,105,255,0.85)] transition-shadow duration-300 hover:shadow-[0_32px_70px_-28px_rgba(56,105,255,0.95)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                  size="lg"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                  <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.55),transparent_45%)] opacity-70" />
                </LoginButton>
              </motion.div>

              <div className="space-y-2 text-center">
                <p className="text-xs text-white/70">
                  We treat your work like our own. Signing in means you're good
                  with our Terms of Service and Privacy Policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
