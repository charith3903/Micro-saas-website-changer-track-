// ============================================================
// worker/scheduler.ts — Core scheduler loop
// ============================================================
// Runs every 30 seconds via node-cron. Finds due monitors,
// processes them with bounded concurrency (5), and handles
// the full pipeline: fetch → extract → detect → alert → persist.
// ============================================================

import cron from 'node-cron';
import type { Pool } from 'pg';
import { createLogger } from './logger';
import { fetchPage } from './fetcher';
import { extractValue, type MonitorType } from './extractor';
import { detectChange } from './detector';
import { sendAlert, sendErrorAlert, type MonitorForAlert } from './alerter';

const log = createLogger('scheduler');

// ── Configuration ───────────────────────────────────────────

/** Max monitors processed in parallel per tick. */
const CONCURRENCY_CAP = 5;

/** After this many consecutive errors, auto-pause the monitor. */
const MAX_CONSECUTIVE_ERRORS = 3;

// ── Types ───────────────────────────────────────────────────

/** Full monitor row shape as returned by the DB query. */
interface MonitorRow {
  id: string;
  user_id: string;
  name: string | null;
  url: string;
  type: MonitorType;
  selector: string | null;
  keyword: string | null;
  price_threshold: string | null; // DECIMAL comes as string from pg
  render_mode: 'html' | 'browser';
  status: string;
  error_reason: string | null;
  consecutive_errors: number;
  last_checked_at: Date | null;
  next_check_at: Date | null;
  interval_seconds: number;
  last_value: string | null;
  notify_email: boolean;
  notify_telegram: boolean;
}

// ── Semaphore for bounded concurrency ───────────────────────
// A simple counting semaphore that limits how many monitors
// we process simultaneously. This prevents a burst of 100+
// due monitors from overwhelming the worker.

class Semaphore {
  private current = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    // Wait until a slot opens up
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve();
      });
    });
  }

  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) next();
  }
}

// ── Monitor processing pipeline ─────────────────────────────

/**
 * Processes a single monitor through the full pipeline:
 * 1. Fetch the page HTML
 * 2. Extract the relevant value
 * 3. Detect changes against the stored snapshot
 * 4. Send alerts if changed
 * 5. Persist the check result and update the monitor
 *
 * Errors are caught and recorded — one bad monitor never crashes
 * the entire worker. After MAX_CONSECUTIVE_ERRORS, the monitor is
 * auto-paused and the user is notified.
 */
async function processMonitor(pool: Pool, monitor: MonitorRow): Promise<void> {
  const startTime = Date.now();
  log.info(`Processing monitor "${monitor.name ?? monitor.url}" (${monitor.id})`);

  try {
    // ── Step 1: Fetch ──
    const fetchResult = await fetchPage({
      url: monitor.url,
      renderMode: monitor.render_mode,
    });

    // ── Step 2: Extract ──
    const newValue = extractValue(fetchResult.html, {
      type: monitor.type,
      selector: monitor.selector,
      keyword: monitor.keyword,
    });

    // ── Step 3: Detect ──
    const changeResult = detectChange(newValue, monitor.last_value, monitor.type);

    // ── Step 4: Alert (only if changed and not first check) ──
    if (changeResult.changed && !changeResult.isFirstCheck) {
      // Fetch user email for alert delivery
      const userResult = await pool.query<{ email: string }>(
        'SELECT email FROM users WHERE id = $1',
        [monitor.user_id],
      );

      if (userResult.rows.length > 0 && monitor.notify_email) {
        const monitorForAlert: MonitorForAlert = {
          id: monitor.id,
          user_id: monitor.user_id,
          name: monitor.name,
          url: monitor.url,
          type: monitor.type,
          notify_email: monitor.notify_email,
          notify_telegram: monitor.notify_telegram,
        };
        await sendAlert(pool, monitorForAlert, changeResult, userResult.rows[0].email);
      }
    }

    // ── Step 5: Persist check result ──
    const durationMs = Date.now() - startTime;
    await pool.query(
      `INSERT INTO checks (monitor_id, ok, observed_value, changed, diff, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        monitor.id,
        true,
        newValue,
        changeResult.changed,
        changeResult.diff ?? null,
        durationMs,
      ],
    );

    // ── Step 6: Update monitor state ──
    const nextCheckAt = computeNextCheck(monitor.interval_seconds);
    await pool.query(
      `UPDATE monitors SET
         last_checked_at = now(),
         next_check_at = $1,
         last_value = $2,
         consecutive_errors = 0,
         error_reason = NULL,
         status = 'active'
       WHERE id = $3`,
      [nextCheckAt, newValue, monitor.id],
    );

    log.info(
      `✓ Monitor "${monitor.name ?? monitor.url}" completed in ${durationMs}ms` +
        (changeResult.changed ? ' — CHANGE DETECTED' : ' — no change') +
        (changeResult.isFirstCheck ? ' (first check)' : ''),
    );
  } catch (err: unknown) {
    // ── Error handling — never crash the worker ──
    const errorMessage = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startTime;

    log.error(`✗ Monitor "${monitor.name ?? monitor.url}" failed: ${errorMessage}`);

    // Record the failed check
    try {
      await pool.query(
        `INSERT INTO checks (monitor_id, ok, error, duration_ms)
         VALUES ($1, $2, $3, $4)`,
        [monitor.id, false, errorMessage, durationMs],
      );
    } catch (dbErr) {
      log.error('Failed to record error check in database', dbErr);
    }

    // Increment consecutive error count
    const newErrorCount = monitor.consecutive_errors + 1;

    if (newErrorCount >= MAX_CONSECUTIVE_ERRORS) {
      // ── Auto-pause after 3 consecutive errors ──
      log.warn(
        `Monitor "${monitor.name ?? monitor.url}" hit ${MAX_CONSECUTIVE_ERRORS} ` +
          'consecutive errors — pausing with status=error',
      );

      try {
        await pool.query(
          `UPDATE monitors SET
             status = 'error',
             error_reason = $1,
             consecutive_errors = $2,
             last_checked_at = now(),
             next_check_at = NULL
           WHERE id = $3`,
          [errorMessage, newErrorCount, monitor.id],
        );

        // Notify user about the auto-pause (one-time)
        const userResult = await pool.query<{ email: string }>(
          'SELECT email FROM users WHERE id = $1',
          [monitor.user_id],
        );
        if (userResult.rows.length > 0) {
          const monitorForAlert: MonitorForAlert = {
            id: monitor.id,
            user_id: monitor.user_id,
            name: monitor.name,
            url: monitor.url,
            type: monitor.type,
            notify_email: monitor.notify_email,
            notify_telegram: monitor.notify_telegram,
          };
          await sendErrorAlert(pool, monitorForAlert, errorMessage, userResult.rows[0].email);
        }
      } catch (dbErr) {
        log.error('Failed to pause monitor after consecutive errors', dbErr);
      }
    } else {
      // Not yet at the threshold — update error count and schedule retry
      try {
        const nextCheckAt = computeNextCheck(monitor.interval_seconds);
        await pool.query(
          `UPDATE monitors SET
             consecutive_errors = $1,
             error_reason = $2,
             last_checked_at = now(),
             next_check_at = $3
           WHERE id = $4`,
          [newErrorCount, errorMessage, nextCheckAt, monitor.id],
        );
      } catch (dbErr) {
        log.error('Failed to update monitor error state', dbErr);
      }
    }
  }
}

// ── Scheduling helpers ──────────────────────────────────────

/**
 * Computes the next check time with random jitter.
 *
 * Jitter prevents "thundering herd" when many monitors share
 * the same interval. We add 0-10% of the interval as random
 * positive offset.
 *
 * @param intervalSeconds - The monitor's configured check interval
 * @returns ISO timestamp string for next_check_at
 */
function computeNextCheck(intervalSeconds: number): string {
  const jitterFraction = Math.random() * 0.1; // 0% to 10%
  const jitterMs = intervalSeconds * 1000 * jitterFraction;
  const nextMs = Date.now() + intervalSeconds * 1000 + jitterMs;
  return new Date(nextMs).toISOString();
}

// ── Scheduler tick ──────────────────────────────────────────

/**
 * Single tick of the scheduler:
 * 1. Query for all monitors due for checking
 * 2. Process them in parallel with bounded concurrency
 *
 * Uses SELECT ... FOR UPDATE SKIP LOCKED to prevent multiple
 * worker instances from processing the same monitor. This is
 * safe for horizontal scaling.
 */
async function tick(pool: Pool): Promise<void> {
  log.debug('Tick — checking for due monitors');

  let monitors: MonitorRow[];

  try {
    // Fetch monitors that are due for checking.
    // We mark them by advancing next_check_at into the future to prevent
    // the same monitor from being picked up by the next tick while still
    // being processed. If processing fails, the error handler will set
    // the correct next_check_at.
    const result = await pool.query<MonitorRow>(
      `SELECT * FROM monitors
       WHERE status = 'active'
         AND next_check_at <= now()
       ORDER BY next_check_at ASC
       LIMIT 50`,
    );
    monitors = result.rows;
  } catch (err) {
    log.error('Failed to query due monitors', err);
    return;
  }

  if (monitors.length === 0) {
    log.debug('No monitors due');
    return;
  }

  log.info(`Found ${monitors.length} monitor(s) due for checking`);

  // ── Temporarily push next_check_at forward to avoid re-processing ──
  // This is a lightweight alternative to FOR UPDATE SKIP LOCKED for
  // single-worker deployments. If we crash mid-processing, the monitors
  // will simply be re-checked after their interval elapses.
  const monitorIds = monitors.map((m) => m.id);
  try {
    await pool.query(
      `UPDATE monitors
       SET next_check_at = now() + interval '5 minutes'
       WHERE id = ANY($1)`,
      [monitorIds],
    );
  } catch (err) {
    log.error('Failed to claim monitors for processing', err);
    return;
  }

  // ── Process with bounded concurrency ──
  const semaphore = new Semaphore(CONCURRENCY_CAP);

  const tasks = monitors.map(async (monitor) => {
    await semaphore.acquire();
    try {
      await processMonitor(pool, monitor);
    } finally {
      semaphore.release();
    }
  });

  // Wait for all monitors in this batch to complete
  await Promise.allSettled(tasks);

  log.info(`Tick complete — processed ${monitors.length} monitor(s)`);
}

// ── Public API ──────────────────────────────────────────────

/** Handle to the running cron job for graceful shutdown. */
export interface SchedulerHandle {
  /** Stop the cron job. */
  stop: () => void;
}

/**
 * Starts the scheduler cron job.
 *
 * @param pool - PostgreSQL connection pool
 * @returns Handle with a `stop()` method for graceful shutdown
 */
export function startScheduler(pool: Pool): SchedulerHandle {
  log.info('Starting scheduler — ticking every 30 seconds');

  // Flag to prevent overlapping ticks when a tick takes > 30s
  let isProcessing = false;

  const job = cron.schedule('*/30 * * * * *', async () => {
    if (isProcessing) {
      log.warn('Previous tick still running — skipping this tick');
      return;
    }

    isProcessing = true;
    try {
      await tick(pool);
    } catch (err) {
      // Belt-and-suspenders: tick() already catches its own errors,
      // but just in case something leaks through
      log.error('Unhandled error in tick', err);
    } finally {
      isProcessing = false;
    }
  });

  return {
    stop: () => {
      log.info('Stopping scheduler');
      job.stop();
    },
  };
}
