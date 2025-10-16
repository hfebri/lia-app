"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingPage } from "@/components/shared/loading";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle2, Database, Shield, Bug } from "lucide-react";

const floatingTransition = {
  duration: 12,
  repeat: Number.POSITIVE_INFINITY,
  ease: "easeInOut",
};

export default function OnboardingPage() {
  const { user, isLoading, isFetchingUser, refreshSession } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [professionalRole, setProfessionalRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not authenticated or already completed onboarding
  useEffect(() => {
    console.log("[ONBOARDING] 📊 Auth state:", {
      isLoading,
      isFetchingUser,
      hasUser: !!user,
      userEmail: user?.email,
      hasCompletedOnboarding: user?.hasCompletedOnboarding,
    });

    // Auth is ready if not loading AND (not fetching OR we have user data)
    // This prevents race condition where user data exists but isFetchingUser is still true
    const isAuthReady = !isLoading && (!isFetchingUser || user !== null);

    if (isAuthReady && !user) {
      console.log(
        "[ONBOARDING] ❌ Auth complete, no user found - redirecting to /signin"
      );
      router.push("/signin");
    } else if (isAuthReady && user?.hasCompletedOnboarding) {
      console.log(
        "[ONBOARDING] ✅ User already completed onboarding - redirecting to /"
      );
      router.push("/");
    } else if (isAuthReady && user) {
      console.log(
        "[ONBOARDING] 🎯 User authenticated, showing onboarding wizard"
      );
    } else {
      console.log("[ONBOARDING] ⏳ Still loading auth state...");
    }
  }, [isLoading, isFetchingUser, user, router]);

  const handleSubmit = async () => {
    if (!professionalRole.trim()) {
      setError("Please enter your professional role");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log("[ONBOARDING] 💾 Submitting profile update...");
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalRole: professionalRole.trim(),
          hasCompletedOnboarding: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      console.log("[ONBOARDING] ✅ Profile updated successfully");
      console.log("[ONBOARDING] 🔄 Refreshing session to get updated user data...");

      // Refresh session to get updated user data
      await refreshSession();

      console.log("[ONBOARDING] ➡️ Redirecting to home...");

      // Use Next.js router for client-side navigation
      router.push("/");
    } catch (error) {
      console.error("[ONBOARDING] ❌ Error updating profile:", error);
      setError("Failed to save your information. Please try again.");
      setIsSubmitting(false);
    }
  };

  const logoSrc = "/logo-light.svg";

  // Show loading screen while authenticating
  // Only wait for isFetchingUser if we don't have user data yet
  // Also show loading if user has already completed onboarding (prevents flash)
  if (!mounted || isLoading || (isFetchingUser && !user) || user?.hasCompletedOnboarding) {
    return <LoadingPage message="Setting up your workspace..." />;
  }

  // Redirect handled by useEffect, show nothing while redirecting
  if (!user) {
    return null;
  }

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
          className="w-full max-w-2xl"
        >
          <Card className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/35 backdrop-blur-3xl shadow-[0_45px_100px_-50px_rgba(45,50,120,0.65)] transition duration-700 dark:border-white/10 dark:bg-white/10 dark:shadow-[0_45px_110px_-60px_rgba(15,23,42,0.85)]">
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
                  className="h-8 w-auto"
                  priority
                />
              </motion.div>

              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  <CardTitle className="text-3xl font-semibold">
                    <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-500 bg-clip-text text-transparent dark:from-indigo-200 dark:via-sky-200 dark:to-purple-200">
                      Welcome, {user.name?.split(" ")[0] || "there"}!
                    </span>
                  </CardTitle>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.6 }}
                >
                  <CardDescription className="text-base text-slate-600 dark:text-slate-300">
                    Let&apos;s personalize your LIA experience
                  </CardDescription>
                </motion.div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label
                          htmlFor="professionalRole"
                          className="text-slate-700 dark:text-slate-200"
                        >
                          What&apos;s your professional role?
                        </Label>
                        <motion.div
                          whileFocus={{ scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Input
                            id="professionalRole"
                            type="text"
                            placeholder="e.g., Business Consultant, Software Engineer, Product Manager"
                            value={professionalRole}
                            onChange={(e) =>
                              setProfessionalRole(e.target.value)
                            }
                            className="h-12 rounded-xl border-slate-200/50 bg-white/50 text-base backdrop-blur-sm placeholder:text-slate-400 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-slate-500"
                            disabled={isSubmitting}
                            autoFocus
                          />
                        </motion.div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          This helps LIA tailor responses to your specific needs
                          and expertise
                        </p>
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 rounded-xl border border-red-200/50 bg-red-50/50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {error}
                        </motion.div>
                      )}

                      <motion.div
                        className="flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="button"
                          onClick={() => {
                            if (!professionalRole.trim()) {
                              setError("Please enter your professional role");
                              return;
                            }
                            setError(null);
                            setStep(2);
                          }}
                          disabled={!professionalRole.trim()}
                          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 text-base font-semibold text-white shadow-[0_25px_55px_-25px_rgba(56,105,255,0.85)] transition-shadow duration-300 hover:shadow-[0_32px_70px_-28px_rgba(56,105,255,0.95)]"
                        >
                          Continue
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <motion.div
                        className="flex items-start gap-3 rounded-xl border border-blue-200/50 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 dark:bg-blue-500/30">
                          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Beta Version
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-200">
                            LIA is currently in beta. You may encounter bugs or
                            unexpected behavior. We&apos;re continuously
                            improving!
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-start gap-3 rounded-xl border border-purple-200/50 bg-purple-50/50 p-4 dark:border-purple-500/20 dark:bg-purple-500/10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 dark:bg-purple-500/30">
                          <Bug className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            Report Bugs
                          </p>
                          <p className="text-xs text-purple-700 dark:text-purple-200">
                            Found an issue? Please let us know! Your feedback
                            helps us make LIA better for everyone.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 dark:bg-amber-500/30">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            AI Limitations
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-200">
                            While LIA is powerful, AI can make mistakes. Always
                            verify critical information and use your
                            professional judgment.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-start gap-3 rounded-xl border border-green-200/50 bg-green-50/50 p-4 dark:border-green-500/20 dark:bg-green-500/10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/20 dark:bg-green-500/30">
                          <Shield className="h-4 w-4 text-green-600 dark:text-green-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            Your Data is Safe
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-200">
                            All your conversations and files are securely stored
                            in our own database. We prioritize your privacy and
                            data security.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-start gap-3 rounded-xl border border-indigo-200/50 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 dark:bg-indigo-500/30">
                          <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                            Private by Design
                          </p>
                          <p className="text-xs text-indigo-700 dark:text-indigo-200">
                            Your data stays with you. We don&apos;t share your
                            information with third parties or use it to train AI
                            models.
                          </p>
                        </div>
                      </motion.div>
                    </div>

                    <div className="flex gap-3">
                      <motion.div
                        className="flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(1)}
                          className="w-full rounded-xl border-slate-200/50 bg-white/50 backdrop-blur-sm hover:bg-white/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                          disabled={isSubmitting}
                        >
                          Back
                        </Button>
                      </motion.div>
                      <motion.div
                        className="flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 text-base font-semibold text-white shadow-[0_25px_55px_-25px_rgba(56,105,255,0.85)] transition-shadow duration-300 hover:shadow-[0_32px_70px_-28px_rgba(56,105,255,0.95)]"
                        >
                          {isSubmitting ? (
                            <span className="flex items-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                              Saving...
                            </span>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-5 w-5" />
                              Get Started
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="flex items-center justify-center gap-2 pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    step === 1
                      ? "w-8 bg-indigo-500"
                      : "bg-slate-300 dark:bg-slate-600"
                  }`}
                />
                <div
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    step === 2
                      ? "w-8 bg-indigo-500"
                      : "bg-slate-300 dark:bg-slate-600"
                  }`}
                />
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
