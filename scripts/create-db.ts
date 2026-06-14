import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function createDb() {
  // Connect to the default 'postgres' database
  const connectionString = process.env.DATABASE_URL?.replace('/webmonitor', '/postgres');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    
    // Check if webmonitor exists
    const res = await client.query("SELECT datname FROM pg_catalog.pg_database WHERE datname = 'webmonitor'");
    
    if (res.rowCount === 0) {
      console.log('Creating database "webmonitor"...');
      await client.query('CREATE DATABASE webmonitor');
      console.log('Database created successfully.');
    } else {
      console.log('Database "webmonitor" already exists.');
    }
  } catch (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDb();
