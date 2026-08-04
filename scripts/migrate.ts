import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  console.log('Running migrations...');

  const migrationsDir = path.join(__dirname, '../db/migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  const client = await pool.connect();

  try {
    // Tracks which migration files have already run, so re-running this
    // script (e.g. after adding a new migration) doesn't re-execute earlier
    // ones that contain non-idempotent statements like bare CREATE INDEX.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const { rows: appliedRows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const applied = new Set(appliedRows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`- ${file} already applied, skipping.`);
        continue;
      }

      console.log(`Executing ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✓ ${file} executed successfully.`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
