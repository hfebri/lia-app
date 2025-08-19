"use client";

import Image from "next/image";
import { useAuth } from "../hooks/use-auth";
import { LoginButton } from "../components/auth/login-button";
import { LogoutButton } from "../components/auth/logout-button";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold mb-4">Welcome to LIA App</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            AI Platform powered by AI Model API
          </p>

          {/* Authentication Status */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">
              Authentication Status:
            </h2>
            {isLoading ? (
              <p className="text-yellow-600">Loading...</p>
            ) : isAuthenticated ? (
              <div className="text-green-600">
                <p>✅ Authenticated</p>
                <p className="text-sm mt-1">
                  Welcome, {user?.name || user?.email}!
                </p>
                <p className="text-xs text-gray-500">
                  Role: {user?.role} | Status:{" "}
                  {user?.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            ) : (
              <p className="text-red-600">❌ Not authenticated</p>
            )}
          </div>

          {/* Authentication Buttons */}
          <div className="flex gap-4 items-center justify-center sm:justify-start">
            {isAuthenticated ? <LogoutButton /> : <LoginButton />}
          </div>
        </div>

        {/* Navigation Links (only show when authenticated) */}
        {isAuthenticated && (
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <a
              className="rounded-full border border-solid border-blue-500 bg-blue-500 text-white transition-colors flex items-center justify-center hover:bg-blue-600 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              href="/dashboard"
            >
              Go to Dashboard
            </a>
            {user?.role === "admin" && (
              <a
                className="rounded-full border border-solid border-purple-500 bg-purple-500 text-white transition-colors flex items-center justify-center hover:bg-purple-600 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                href="/admin"
              >
                Admin Panel
              </a>
            )}
          </div>
        )}
      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <p className="text-sm text-gray-500">LIA App - AI Platform</p>
      </footer>
    </div>
  );
}
