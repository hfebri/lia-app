import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

async function main() {
  console.log('Running manual index migration...');

  const indexes = [
    { name: 'user_sessions_user_id_idx', table: 'user_sessions', columns: ['user_id'] },
    { name: 'user_sessions_last_seen_at_idx', table: 'user_sessions', columns: ['last_seen_at'] },
    { name: 'user_sessions_user_id_last_seen_idx', table: 'user_sessions', columns: ['user_id', 'last_seen_at'] },
    { name: 'user_sessions_session_id_idx', table: 'user_sessions', columns: ['session_id'] },
    { name: 'conversations_user_id_idx', table: 'conversations', columns: ['user_id'] },
    { name: 'conversations_updated_at_idx', table: 'conversations', columns: ['updated_at'] },
    { name: 'conversations_user_id_updated_at_idx', table: 'conversations', columns: ['user_id', 'updated_at'] },
  ];

  for (const idx of indexes) {
    try {
      console.log(`Creating index ${idx.name} on ${idx.table}...`);
      // Using unsafe because index creation syntax is specific and parameterized queries for identifiers are tricky
      // Check if index exists first to avoid error
      const exists = await sql`
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = ${idx.name}
      `;

      if (exists.length === 0) {
        const cols = idx.columns.map(c => `"${c}"`).join(',');
        await sql.unsafe(`CREATE INDEX "${idx.name}" ON "${idx.table}" USING btree (${cols})`);
        console.log(`Index ${idx.name} created.`);
      } else {
        console.log(`Index ${idx.name} already exists.`);
      }
    } catch (e: any) {
      console.error(`Error creating index ${idx.name}:`, e.message);
    }
  }

  console.log('Index migration complete.');
  process.exit(0);
}

main();
