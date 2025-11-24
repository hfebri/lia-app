import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

async function main() {
  console.log('Running manual migration...');

  try {
    console.log('Creating user_sessions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "session_id" varchar(255) NOT NULL,
        "last_seen_at" timestamp DEFAULT now() NOT NULL,
        "user_agent" text,
        "ip_address" varchar(45),
        "device_type" varchar(50),
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
      );
    `;
    console.log('user_sessions table created or already exists.');
  } catch (e) {
    console.error('Error creating user_sessions:', e);
  }

  const columns = [
    'real_time_active_users',
    'daily_active_users',
    'weekly_active_users',
    'monthly_active_users'
  ];

  for (const col of columns) {
    try {
      console.log(`Adding column ${col} to daily_metrics...`);
      // Use raw string for column name since sql() helper might quote it differently or not support it in DDL
      await sql.unsafe(`ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "${col}" integer DEFAULT 0 NOT NULL`);
      console.log(`Column ${col} added.`);
    } catch (e: any) {
      console.log(`Column ${col} might already exist or error:`, e.message);
    }
  }

  try {
    console.log('Adding FK constraint to user_sessions...');
    await sql`
      DO $$ BEGIN
        ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('FK constraint added.');
  } catch (e) {
    console.error('Error adding FK constraint:', e);
  }

  console.log('Migration complete.');
  process.exit(0);
}

main();
