"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AuthDebug() {
  const { user, session, isLoading, isAuthenticated } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const checkSupabaseSession = async () => {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log("🔍 Manual Supabase session check:", { session, error });
    setDebugInfo({ session, error });
  };

  const checkUserAPI = async () => {
    if (!session?.user?.email) {
      console.log("❌ No email in session to check");
      return;
    }

    try {
      const response = await fetch("/api/auth/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: session.user.email }),
      });

      const result = response.ok ? await response.json() : await response.text();
      console.log("🔍 Manual user API check:", { status: response.status, result });
    } catch (error) {
      console.error("💥 Error in manual user API check:", error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-background border rounded-lg shadow-lg max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="text-xs space-y-1">
        <div>Loading: {isLoading ? "Yes" : "No"}</div>
        <div>Authenticated: {isAuthenticated ? "Yes" : "No"}</div>
        <div>User: {user ? user.email : "None"}</div>
        <div>Session: {session ? "Yes" : "No"}</div>
        <div>Session Email: {session?.user?.email || "None"}</div>
      </div>
      <div className="mt-2 space-x-2">
        <Button size="sm" onClick={checkSupabaseSession}>
          Check Session
        </Button>
        <Button size="sm" onClick={checkUserAPI}>
          Check User API
        </Button>
      </div>
      {debugInfo && (
        <div className="mt-2 text-xs">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}