"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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

const floatingTransition = {
  duration: 12,
  repeat: Number.POSITIVE_INFINITY,
  ease: "easeInOut",
};

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const logoSrc = "/logo-light.svg";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-indigo-400/40 blur-3xl dark:bg-indigo-600/30"
        animate={{ x: [0, 40, 0], y: [0, 20, 0], rotate: [0, 15, -10, 0] }}
        transition={floatingTransition}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-500/25"
        animate={{ x: [0, -30, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ ...floatingTransition, duration: 14 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.08),_transparent_55%)]"
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
          <Card className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/35 backdrop-blur-3xl shadow-[0_45px_100px_-50px_rgba(45,50,120,0.65)] transition duration-700 hover:shadow-[0_55px_120px_-55px_rgba(45,50,120,0.75)] dark:border-white/10 dark:bg-white/10 dark:shadow-[0_45px_110px_-60px_rgba(15,23,42,0.85)]">
            <div className="pointer-events-none absolute inset-px rounded-[30px] border border-white/30 bg-gradient-to-b from-white/55 via-white/10 to-white/5 dark:border-white/5 dark:from-white/10 dark:via-white/5 dark:to-transparent" />
            <div className="pointer-events-none absolute -top-32 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-white/25 blur-3xl dark:bg-white/10" />

            <CardHeader className="relative space-y-7 pb-8 text-center">
              <motion.div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 shadow-[0_22px_40px_-18px_rgba(56,128,255,0.45)] dark:bg-white/15"
                animate={{ rotate: [0, 6, -6, 0], y: [0, -4, 0] }}
                transition={{
                  duration: 6,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                <Image
                  alt="LIA logo"
                  src={logoSrc}
                  height={32}
                  width={48}
                  priority
                />
              </motion.div>

              <div className="space-y-3">
                <CardTitle className="text-3xl font-semibold">
                  <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-500 bg-clip-text text-transparent dark:from-indigo-200 dark:via-sky-200 dark:to-purple-200">
                    LIA is ready when you are
                  </span>
                </CardTitle>
                <CardDescription className="text-base text-slate-600 dark:text-slate-300">
                  Bring calm to busy deal days, spark sharper conversations, and
                  move forward with confidence.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-8">
              <div className="grid gap-3 rounded-2xl border border-slate-200/50 bg-white/30 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-white/10 dark:bg-white/5">
                <motion.div
                  className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-200"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
                    1
                  </span>
                  Turn long decks and document stacks into quick, human chats.
                </motion.div>
                <motion.div
                  className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-200"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 font-semibold text-sky-600 dark:bg-sky-500/20 dark:text-sky-200">
                    2
                  </span>
                  Keep every insight private with controls that stay on your
                  side.
                </motion.div>
                <motion.div
                  className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-200"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 font-semibold text-purple-600 dark:bg-purple-500/20 dark:text-purple-200">
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
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
