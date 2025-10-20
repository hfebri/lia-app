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
      console.log(
        "[ONBOARDING] 🔄 Refreshing session to get updated user data..."
      );

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

  // Show loading screen while authenticating
  // Only wait for isFetchingUser if we don't have user data yet
  // Also show loading if user has already completed onboarding (prevents flash)
  if (
    !mounted ||
    isLoading ||
    (isFetchingUser && !user) ||
    user?.hasCompletedOnboarding
  ) {
    return <LoadingPage message="Setting up your workspace..." />;
  }

  // Redirect handled by useEffect, show nothing while redirecting
  if (!user) {
    return null;
  }

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
          className="w-full max-w-2xl"
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
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  <CardTitle className="text-3xl font-semibold text-white">
                    Welcome, {user.name?.split(" ")[0] || "there"}!
                  </CardTitle>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.6 }}
                >
                  <CardDescription className="text-base text-white/90">
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
                          className="text-white"
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
                            className="h-12 rounded-xl border-white/20 bg-white/10 text-white text-base backdrop-blur-sm placeholder:text-white/50 focus-visible:ring-white/30"
                            disabled={isSubmitting}
                            autoFocus
                          />
                        </motion.div>
                        <p className="text-xs text-white/70">
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
                        className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                          <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            Beta Version
                          </p>
                          <p className="text-xs text-white/80">
                            LIA is currently in beta. You may encounter bugs or
                            unexpected behavior. We&apos;re continuously
                            improving!
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                          <Bug className="h-4 w-4 text-white" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            Report Bugs
                          </p>
                          <p className="text-xs text-white/80">
                            Found an issue? Please let us know! Your feedback
                            helps us make LIA better for everyone.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                          <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            AI Limitations
                          </p>
                          <p className="text-xs text-white/80">
                            While LIA is powerful, AI can make mistakes. Always
                            verify critical information and use your
                            professional judgment.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                          <Shield className="h-4 w-4 text-white" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            Your Data is Safe
                          </p>
                          <p className="text-xs text-white/80">
                            All your conversations and files are securely stored
                            in our own database. We prioritize your privacy and
                            data security.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                          <Database className="h-4 w-4 text-white" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            Private by Design
                          </p>
                          <p className="text-xs text-white/80">
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
                          className="w-full rounded-xl border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
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
