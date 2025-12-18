/**
 * Production Readiness Test Script
 *
 * This script runs comprehensive checks to verify the application
 * is ready for production deployment.
 *
 * Usage:
 *   npm run test:production
 *
 *   # Or with a custom base URL for API tests:
 *   npm run test:production -- --url=https://your-app.netlify.app
 */

import { config } from "dotenv";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
config({ path: ".env.local" });

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

// Color codes for terminal output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message: string) {
  console.log(message);
}

function logSuccess(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message: string) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logWarning(message: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logHeader(title: string) {
  console.log(`\n${colors.bold}${colors.blue}${title}${colors.reset}`);
  console.log("─".repeat(50));
}

// ============================================
// Test 1: Environment Variables
// ============================================
function testEnvironmentVariables(): TestResult {
  logHeader("1. Environment Variables");

  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "DATABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const optionalEnvVars = [
    { name: "OPENAI_API_KEY", description: "OpenAI AI Provider" },
    { name: "ANTHROPIC_API_KEY", description: "Anthropic AI Provider" },
    { name: "REPLICATE_API_TOKEN", description: "Replicate AI Provider" },
    { name: "NEXT_PUBLIC_SITE_URL", description: "Site URL for auth redirects" },
    { name: "CRON_SECRET", description: "Cron job authentication" },
    { name: "SUPABASE_STORAGE_BUCKET", description: "Storage bucket name" },
  ];

  const missing: string[] = [];
  const present: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      present.push(envVar);
      logSuccess(`${envVar} is set`);
    } else {
      missing.push(envVar);
      logError(`${envVar} is MISSING`);
    }
  }

  log("\n  Optional variables:");
  for (const { name, description } of optionalEnvVars) {
    if (process.env[name]) {
      logSuccess(`${name} - ${description}`);
    } else {
      logWarning(`${name} - ${description} (not set)`);
    }
  }

  if (missing.length > 0) {
    return {
      name: "Environment Variables",
      passed: false,
      message: `Missing ${missing.length} required environment variable(s)`,
      details: missing.join(", "),
    };
  }

  return {
    name: "Environment Variables",
    passed: true,
    message: `All ${requiredEnvVars.length} required variables are set`,
  };
}

// ============================================
// Test 2: TypeScript Compilation
// ============================================
function testTypeScript(): TestResult {
  logHeader("2. TypeScript Compilation");

  try {
    log("  Running tsc --noEmit...");
    execSync("npx tsc --noEmit", { stdio: "pipe" });
    logSuccess("TypeScript compilation passed");
    return {
      name: "TypeScript Compilation",
      passed: true,
      message: "No type errors found",
    };
  } catch (error: any) {
    const output = error.stdout?.toString() || error.stderr?.toString() || "";
    logError("TypeScript compilation failed");
    
    // Count errors
    const errorMatch = output.match(/Found (\d+) error/);
    const errorCount = errorMatch ? errorMatch[1] : "unknown";
    
    return {
      name: "TypeScript Compilation",
      passed: false,
      message: `Found ${errorCount} type error(s)`,
      details: output.split("\n").slice(0, 10).join("\n"),
    };
  }
}

// ============================================
// Test 3: ESLint Check
// ============================================
function testESLint(): TestResult {
  logHeader("3. ESLint Check");

  try {
    log("  Running next lint...");
    execSync("npm run lint", { stdio: "pipe" });
    logSuccess("ESLint passed");
    return {
      name: "ESLint Check",
      passed: true,
      message: "No linting errors found",
    };
  } catch (error: any) {
    const output = error.stdout?.toString() || error.stderr?.toString() || "";
    logError("ESLint found issues");
    return {
      name: "ESLint Check",
      passed: false,
      message: "Linting errors found",
      details: output.split("\n").slice(0, 10).join("\n"),
    };
  }
}

// ============================================
// Test 4: Next.js Build
// ============================================
function testBuild(): TestResult {
  logHeader("4. Next.js Build");

  try {
    log("  Running next build... (this may take a minute)");
    execSync("npm run build", { 
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "production" }
    });
    logSuccess("Build completed successfully");
    return {
      name: "Next.js Build",
      passed: true,
      message: "Production build successful",
    };
  } catch (error: any) {
    const output = error.stdout?.toString() || error.stderr?.toString() || "";
    logError("Build failed");
    return {
      name: "Next.js Build",
      passed: false,
      message: "Production build failed",
      details: output.split("\n").slice(-20).join("\n"),
    };
  }
}

// ============================================
// Test 5: Database Connection
// ============================================
async function testDatabaseConnection(): Promise<TestResult> {
  logHeader("5. Database Connection");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logError("Missing Supabase credentials");
    return {
      name: "Database Connection",
      passed: false,
      message: "Missing Supabase URL or Service Role Key",
    };
  }

  try {
    log("  Connecting to Supabase...");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test database connection by querying users table
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (error) {
      throw error;
    }

    logSuccess("Database connection successful");
    return {
      name: "Database Connection",
      passed: true,
      message: "Successfully connected to Supabase",
    };
  } catch (error: any) {
    logError("Database connection failed");
    return {
      name: "Database Connection",
      passed: false,
      message: "Failed to connect to database",
      details: error.message,
    };
  }
}

// ============================================
// Test 6: Storage Bucket Access
// ============================================
async function testStorageBucket(): Promise<TestResult> {
  logHeader("6. Storage Bucket Access");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "files";

  if (!supabaseUrl || !supabaseKey) {
    logWarning("Skipping - Missing Supabase credentials");
    return {
      name: "Storage Bucket Access",
      passed: true,
      message: "Skipped - credentials not available",
    };
  }

  try {
    log(`  Checking bucket "${bucketName}"...`);
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase.storage.getBucket(bucketName);

    if (error) {
      throw error;
    }

    logSuccess(`Storage bucket "${bucketName}" accessible`);
    return {
      name: "Storage Bucket Access",
      passed: true,
      message: `Bucket "${bucketName}" is accessible`,
    };
  } catch (error: any) {
    logError(`Storage bucket "${bucketName}" not accessible`);
    return {
      name: "Storage Bucket Access",
      passed: false,
      message: `Failed to access bucket "${bucketName}"`,
      details: error.message,
    };
  }
}

// ============================================
// Test 7: API Routes Health Check
// ============================================
async function testAPIRoutes(baseUrl: string): Promise<TestResult> {
  logHeader("7. API Routes Health Check");

  const apiRoutes = [
    { path: "/api/env-test", method: "GET", name: "Environment Test" },
  ];

  const failedRoutes: string[] = [];

  for (const route of apiRoutes) {
    try {
      log(`  Testing ${route.name}...`);
      const response = await fetch(`${baseUrl}${route.path}`, {
        method: route.method,
      });

      if (response.ok) {
        logSuccess(`${route.name} (${route.path}) - ${response.status}`);
      } else {
        logError(`${route.name} (${route.path}) - ${response.status}`);
        failedRoutes.push(`${route.path}: ${response.status}`);
      }
    } catch (error: any) {
      logError(`${route.name} (${route.path}) - Connection failed`);
      failedRoutes.push(`${route.path}: Connection failed`);
    }
  }

  if (failedRoutes.length > 0) {
    return {
      name: "API Routes Health Check",
      passed: false,
      message: `${failedRoutes.length} route(s) failed`,
      details: failedRoutes.join(", "),
    };
  }

  return {
    name: "API Routes Health Check",
    passed: true,
    message: `All ${apiRoutes.length} routes responding`,
  };
}

// ============================================
// Main Entry Point
// ============================================
async function main() {
  console.log("\n" + "=".repeat(50));
  console.log(`${colors.bold}  Production Readiness Check${colors.reset}`);
  console.log("=".repeat(50));
  console.log(`  Time: ${new Date().toISOString()}`);

  // Parse command line arguments
  const args = process.argv.slice(2);
  let baseUrl = "http://localhost:3000";
  let skipBuild = false;
  let skipApi = false;

  for (const arg of args) {
    if (arg.startsWith("--url=")) {
      baseUrl = arg.replace("--url=", "");
    }
    if (arg === "--skip-build") {
      skipBuild = true;
    }
    if (arg === "--skip-api") {
      skipApi = true;
    }
  }

  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Skip Build: ${skipBuild}`);
  console.log(`  Skip API: ${skipApi}`);

  // Run tests
  results.push(testEnvironmentVariables());
  results.push(testTypeScript());
  results.push(testESLint());

  if (!skipBuild) {
    results.push(testBuild());
  } else {
    log("\n⏭  Skipping build test (--skip-build)");
  }

  results.push(await testDatabaseConnection());
  results.push(await testStorageBucket());

  if (!skipApi) {
    results.push(await testAPIRoutes(baseUrl));
  } else {
    log("\n⏭  Skipping API routes test (--skip-api)");
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log(`${colors.bold}  Summary${colors.reset}`);
  console.log("=".repeat(50));

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  for (const result of results) {
    if (result.passed) {
      logSuccess(`${result.name}: ${result.message}`);
    } else {
      logError(`${result.name}: ${result.message}`);
      if (result.details) {
        console.log(`     ${colors.yellow}Details: ${result.details}${colors.reset}`);
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  if (failed.length === 0) {
    console.log(
      `${colors.green}${colors.bold}  ✓ RESULT: ${passed.length}/${results.length} checks passed - Ready for production!${colors.reset}`
    );
    console.log("=".repeat(50) + "\n");
    process.exit(0);
  } else {
    console.log(
      `${colors.red}${colors.bold}  ✗ RESULT: ${passed.length}/${results.length} checks passed - NOT ready for production${colors.reset}`
    );
    console.log("=".repeat(50) + "\n");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
