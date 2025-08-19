"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

export default function DebugPage() {
  const [status, setStatus] = useState("Checking...");
  const [error, setError] = useState("");
  const [envVars, setEnvVars] = useState({
    url: "",
    key: "",
  });

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
        }
      } catch (err: any) {
        setError(err.message);
        setStatus("❌ Failed");
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Debug</h1>

      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Connection Status:</h2>
          <p className="text-lg">{status}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Environment Variables:</h2>
          <p>NEXT_PUBLIC_SUPABASE_URL: {envVars.url}</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {envVars.key}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Details:</h2>
          <p>{error}</p>
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-semibold">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              If environment variables are missing, check your .env.local file
            </li>
            <li>If Supabase error, check your project URL and anon key</li>
            <li>
              If connected but no session, authentication is working correctly
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
