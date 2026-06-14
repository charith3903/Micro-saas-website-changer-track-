// ============================================================
// worker/index.ts — Worker entry point
// ============================================================
// Run with: npx tsx worker/index.ts
//
// Responsibilities:
// 1. Load environment variables from .env
// 2. Create a PostgreSQL connection pool
// 3. Start the scheduler
// 4. Handle graceful shutdown (SIGINT/SIGTERM)
// ============================================================

// Load .env FIRST — before any module that reads process.env
import 'dotenv/config';

import { Pool } from 'pg';
import { createLogger } from './logger';
import { startScheduler, type SchedulerHandle } from './scheduler';

const log = createLogger('worker');

// ── Database connection ─────────────────────────────────────

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    log.error('DATABASE_URL is not set — cannot connect to database');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    // Sensible defaults for a background worker
    max: 10,                   // max connections in pool
    idleTimeoutMillis: 30_000, // close idle connections after 30s
    connectionTimeoutMillis: 5_000, // fail fast if DB is unreachable
  });

  // Log pool-level errors (e.g. unexpected disconnects)
  pool.on('error', (err) => {
    log.error('Unexpected database pool error', err);
  });

  return pool;
}

// ── Main ────────────────────────────────────────────────────

async function main(): Promise<void> {
  log.info('═══════════════════════════════════════════════════');
  log.info('  WebMonitor Background Worker starting up...');
  log.info('═══════════════════════════════════════════════════');

  // ── Validate required config ──
  const requiredEnvVars = ['DATABASE_URL'];
  const optionalEnvVars = ['RESEND_API_KEY', 'ALERT_FROM_EMAIL', 'NEXT_PUBLIC_APP_URL'];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      log.error(`Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  for (const key of optionalEnvVars) {
    if (!process.env[key]) {
      log.warn(`Optional env var ${key} is not set — using defaults`);
    }
  }

  // ── Connect to database ──
  const pool = createPool();

  // Verify the connection works before starting the scheduler
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    log.info(`Database connected — server time: ${result.rows[0].server_time}`);
  } catch (err) {
    log.error('Failed to connect to database', err);
    process.exit(1);
  }

  // ── Start scheduler ──
  const scheduler: SchedulerHandle = startScheduler(pool);

  log.info('Worker is running. Press Ctrl+C to stop.');
  log.info('═══════════════════════════════════════════════════');

  // ── Graceful shutdown ──
  // We handle both SIGINT (Ctrl+C) and SIGTERM (Docker/systemd stop)
  // to ensure we cleanly finish in-progress checks and close the pool.

  let isShuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return; // prevent double-shutdown
    isShuttingDown = true;

    log.info(`\nReceived ${signal} — shutting down gracefully...`);

    // 1. Stop the cron job so no new ticks are scheduled
    scheduler.stop();

    // 2. Close the database pool (waits for active queries to finish)
    try {
      await pool.end();
      log.info('Database pool closed');
    } catch (err) {
      log.error('Error closing database pool', err);
    }

    log.info('Worker stopped. Goodbye! 👋');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // On Windows, handle Ctrl+C via SIGBREAK as well
  process.on('SIGBREAK', () => shutdown('SIGBREAK'));

  // Catch unhandled promise rejections — log them but don't crash
  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled promise rejection (worker will continue)', reason);
  });

  // Catch uncaught exceptions — these are more serious
  process.on('uncaughtException', (err) => {
    log.error('Uncaught exception — shutting down', err);
    shutdown('uncaughtException').catch(() => process.exit(1));
  });
}

// ── Launch ──────────────────────────────────────────────────

main().catch((err) => {
  console.error('Fatal error during worker startup:', err);
  process.exit(1);
});
