"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function DebugPage() {
  const { user, session, isLoading, isAuthenticated, signInWithGoogle, signOut } = useAuth();
  const [status, setStatus] = useState("Checking...");
  const [error, setError] = useState("");
  const [envVars, setEnvVars] = useState({
    url: "",
    key: "",
  });
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [userApiResponse, setUserApiResponse] = useState<any>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check environment variables
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        setEnvVars({
          url: url ? `${url.substring(0, 20)}...` : "Missing",
          key: key ? `${key.substring(0, 20)}...` : "Missing",
        });

        if (!url || !key) {
          setError("Environment variables missing");
          setStatus("❌ Failed");
          return;
        }

        // Try to create Supabase client
        const supabase = createClient();

        // Test connection with a simple query
        const { data, error: authError } = await supabase.auth.getSession();

        if (authError) {
          setError(`Supabase error: ${authError.message}`);
          setStatus("❌ Failed");
        } else {
          setStatus("✅ Connected");
          setError(`Session: ${data.session ? "Exists" : "None"}`);
          setSupabaseSession(data);
        }
      } catch (err: any) {
        setError(err.message);
        setStatus("❌ Failed");
      }
    };

    checkConnection();
  }, []);

  const testUserApi = async () => {
    if (!supabaseSession?.session?.user?.email) {
      alert("No email in session");
      return;
    }

    try {
      const response = await fetch("/api/auth/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: supabaseSession.session.user.email }),
      });

      const result = response.ok ? await response.json() : await response.text();
      setUserApiResponse({ status: response.status, result });
    } catch (error: any) {
      setUserApiResponse({ error: error.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Supabase Connection Status:</h2>
          <p className="text-lg">{status}</p>
          <p className="text-sm mt-2">{error}</p>
        </div>

        {/* Environment Variables */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Environment Variables:</h2>
          <p>NEXT_PUBLIC_SUPABASE_URL: {envVars.url}</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {envVars.key}</p>
        </div>

        {/* useAuth Hook State */}
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-semibold">useAuth Hook State:</h2>
          <p><strong>isLoading:</strong> {isLoading ? "true" : "false"}</p>
          <p><strong>isAuthenticated:</strong> {isAuthenticated ? "true" : "false"}</p>
          <p><strong>user:</strong> {user ? user.email : "null"}</p>
          <p><strong>session:</strong> {session ? "Present" : "null"}</p>
          {session && (
            <p><strong>session email:</strong> {session.user?.email}</p>
          )}
        </div>

        {/* Direct Supabase Session */}
        <div className="bg-green-100 p-4 rounded">
          <h2 className="font-semibold">Direct Supabase Session:</h2>
          <p><strong>Session:</strong> {supabaseSession?.session ? "Present" : "null"}</p>
          {supabaseSession?.session && (
            <>
              <p><strong>User Email:</strong> {supabaseSession.session.user?.email}</p>
              <p><strong>User ID:</strong> {supabaseSession.session.user?.id}</p>
            </>
          )}
        </div>

        {/* User API Test */}
        <div className="bg-yellow-100 p-4 rounded">
          <h2 className="font-semibold">User API Test:</h2>
          <Button 
            onClick={testUserApi} 
            disabled={!supabaseSession?.session?.user?.email}
            className="mb-2"
          >
            Test User API
          </Button>
          {userApiResponse && (
            <div className="text-sm">
              <p><strong>Status:</strong> {userApiResponse.status}</p>
              <p><strong>Response:</strong></p>
              <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(userApiResponse.result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-purple-100 p-4 rounded">
          <h2 className="font-semibold">Actions:</h2>
          <div className="space-y-2">
            <Button onClick={signInWithGoogle} disabled={isLoading} className="block">
              Sign In with Google
            </Button>
            <Button 
              onClick={signOut} 
              disabled={isLoading || !isAuthenticated} 
              variant="outline"
              className="block"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 p-4 rounded">
        <h2 className="font-semibold">Debug Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>If environment variables are missing, check your .env.local file</li>
          <li>If Supabase error, check your project URL and anon key</li>
          <li>If you have a session but no user profile, the user might not exist in the database</li>
          <li>If isAuthenticated is false but you have a session, check the user API response</li>
          <li>Check the browser console for detailed authentication logs</li>
        </ol>
      </div>
    </div>
  );
}
