import { Pool, QueryResult } from 'pg';

// ============================================================
// PostgreSQL connection pool
// Uses DATABASE_URL from environment
// ============================================================

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Example: postgresql://postgres:password@localhost:5432/webmonitor'
      );
    }

    pool = new Pool({
      connectionString,
      max: 10,                    // max connections in pool
      idleTimeoutMillis: 30000,   // close idle connections after 30s
      connectionTimeoutMillis: 5000,
    });

    // Log connection errors (don't crash)
    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });
  }

  return pool;
}

// ============================================================
// Helper: run a parameterized query
// ============================================================
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  // Log slow queries in development
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 80));
  }

  return result;
}

// ============================================================
// Helper: get a single row or null
// ============================================================
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

// ============================================================
// Helper: get all rows
// ============================================================
export async function queryAll<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// ============================================================
// Cleanup: close the pool (for graceful shutdown)
// ============================================================
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
