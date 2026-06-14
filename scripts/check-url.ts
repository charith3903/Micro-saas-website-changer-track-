import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT url FROM monitors WHERE id = '2a231661-1e5b-4bcc-8cdf-5d6024466987'")
  .then(res => { console.log('URL:', res.rows[0]?.url); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
