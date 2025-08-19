import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING",
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "PRESENT"
      : "MISSING",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "MISSING",
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter((key) =>
      key.startsWith("NEXT_PUBLIC_")
    ),
  });
}
