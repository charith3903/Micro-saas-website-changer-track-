// ============================================================
// worker/logger.ts — Structured logging with color and context
// ============================================================
// Format: [2024-01-01 12:00:00] [INFO] [scheduler] Message here
// Uses ANSI escape codes for color in supported terminals.
// ============================================================

/** Supported log levels ordered by severity. */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Numeric severity for filtering — higher is more severe. */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** ANSI color codes for each level. */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',  // cyan
  info: '\x1b[32m',   // green
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

/**
 * Minimum log level — controlled by LOG_LEVEL env var.
 * Defaults to 'info' in production, 'debug' otherwise.
 */
const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Pad timestamp to a consistent `YYYY-MM-DD HH:MM:SS` format.
 */
function timestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

/**
 * Core logging function. All public helpers delegate here.
 *
 * @param level   - Severity of the message
 * @param context - Short label identifying the subsystem (e.g. "scheduler", "fetcher")
 * @param message - Human-readable log line
 * @param data    - Optional structured payload for debugging
 */
function log(
  level: LogLevel,
  context: string,
  message: string,
  data?: unknown,
): void {
  // Skip if below configured threshold
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[MIN_LEVEL]) return;

  const color = LEVEL_COLORS[level];
  const tag = level.toUpperCase().padEnd(5); // align: "INFO ", "WARN ", "ERROR"

  const prefix = `${DIM}[${timestamp()}]${RESET} ${color}${BOLD}[${tag}]${RESET} ${DIM}[${context}]${RESET}`;
  const line = `${prefix} ${message}`;

  // Route to the correct console method so stderr gets errors
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.log;

  if (data !== undefined) {
    fn(line, data);
  } else {
    fn(line);
  }
}

// ── Public API ──────────────────────────────────────────────

/**
 * Creates a child logger bound to a specific context label.
 * Usage:
 *   const log = createLogger('scheduler');
 *   log.info('Tick started');
 */
export function createLogger(context: string) {
  return {
    debug: (msg: string, data?: unknown) => log('debug', context, msg, data),
    info: (msg: string, data?: unknown) => log('info', context, msg, data),
    warn: (msg: string, data?: unknown) => log('warn', context, msg, data),
    error: (msg: string, data?: unknown) => log('error', context, msg, data),
  };
}

/** Convenience type for passing loggers around. */
export type Logger = ReturnType<typeof createLogger>;
