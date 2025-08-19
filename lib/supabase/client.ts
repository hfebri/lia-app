import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Debug logging for client-side environment variables
  console.log("Client-side env check:", {
    url: url ? `${url.substring(0, 20)}...` : "MISSING",
    key: key ? `${key.substring(0, 20)}...` : "MISSING",
    allEnvKeys: Object.keys(process.env).filter((k) =>
      k.startsWith("NEXT_PUBLIC_")
    ),
  });

  if (!url || !key) {
    throw new Error(
      `Missing Supabase environment variables. URL: ${
        url ? "present" : "missing"
      }, Key: ${key ? "present" : "missing"}`
    );
  }

  return createBrowserClient(url, key);
}
