import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

async function checkActiveUsersData() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const client = postgres(baseUrl, { prepare: false, max: 1 });

  try {
    const now = new Date();
    console.log("Current time:", now.toISOString());
    console.log("=" .repeat(70));

    // 1. Check all user_sessions data
    console.log("\n📊 ALL USER SESSIONS:");
    console.log("-" .repeat(70));
    const allSessions = await client`
      SELECT
        user_id,
        session_id,
        last_seen_at,
        device_type,
        is_active,
        created_at
      FROM user_sessions
      ORDER BY last_seen_at DESC
    `;

    if (allSessions.length === 0) {
      console.log("⚠️  No user sessions found in the database!");
    } else {
      allSessions.forEach((session, idx) => {
        console.log(`\nSession ${idx + 1}:`);
        console.log(`  User ID: ${session.user_id}`);
        console.log(`  Session ID: ${session.session_id.substring(0, 20)}...`);
        console.log(`  Last seen: ${session.last_seen_at}`);
        console.log(`  Device: ${session.device_type || 'unknown'}`);
        console.log(`  Active: ${session.is_active}`);
        console.log(`  Created: ${session.created_at}`);
      });
    }

    // 2. Calculate time thresholds
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log("\n\n⏰ TIME THRESHOLDS:");
    console.log("-" .repeat(70));
    console.log(`Real-time (15 min ago): ${fifteenMinutesAgo.toISOString()}`);
    console.log(`Daily (24 hours ago):   ${twentyFourHoursAgo.toISOString()}`);
    console.log(`Weekly (7 days ago):    ${sevenDaysAgo.toISOString()}`);
    console.log(`Monthly (30 days ago):  ${thirtyDaysAgo.toISOString()}`);

    // 3. Query active users for each period
    console.log("\n\n📈 ACTIVE USERS METRICS:");
    console.log("-" .repeat(70));

    const [realTime, daily, weekly, monthly] = await Promise.all([
      client`
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_sessions
        WHERE last_seen_at >= ${fifteenMinutesAgo}
      `,
      client`
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_sessions
        WHERE last_seen_at >= ${twentyFourHoursAgo}
      `,
      client`
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_sessions
        WHERE last_seen_at >= ${sevenDaysAgo}
      `,
      client`
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_sessions
        WHERE last_seen_at >= ${thirtyDaysAgo}
      `,
    ]);

    console.log(`\n✅ Real-time Active Users (last 15 min):  ${realTime[0].count}`);
    console.log(`✅ Daily Active Users (last 24 hours):    ${daily[0].count}`);
    console.log(`✅ Weekly Active Users (last 7 days):     ${weekly[0].count}`);
    console.log(`✅ Monthly Active Users (last 30 days):   ${monthly[0].count}`);

    // 4. Check daily_metrics table
    console.log("\n\n📅 DAILY METRICS TABLE:");
    console.log("-" .repeat(70));
    const dailyMetrics = await client`
      SELECT
        date,
        real_time_active_users,
        daily_active_users,
        weekly_active_users,
        monthly_active_users,
        total_users,
        created_at
      FROM daily_metrics
      ORDER BY date DESC
      LIMIT 5
    `;

    if (dailyMetrics.length === 0) {
      console.log("⚠️  No daily metrics found. Run the cron job to collect metrics.");
    } else {
      console.log("\nLast 5 daily snapshots:");
      dailyMetrics.forEach((metric) => {
        console.log(`\n  Date: ${metric.date}`);
        console.log(`    Real-time: ${metric.real_time_active_users || 0}`);
        console.log(`    Daily: ${metric.daily_active_users || 0}`);
        console.log(`    Weekly: ${metric.weekly_active_users || 0}`);
        console.log(`    Monthly: ${metric.monthly_active_users || 0}`);
        console.log(`    Total users: ${metric.total_users || 0}`);
      });
    }

    console.log("\n" + "=" .repeat(70));
    console.log("\n✅ These are the numbers that should appear in your dashboard!");
    console.log("   If they don't match, there might be a frontend issue.\n");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.error("Full error:", error);
  } finally {
    await client.end();
  }
}

checkActiveUsersData();
