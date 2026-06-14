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
  const files = fs.readdirSync(migrationsDir).sort();
  
  const client = await pool.connect();
  
  try {
    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Executing ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`✓ ${file} executed successfully.`);
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
