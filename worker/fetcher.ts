// ============================================================
// worker/fetcher.ts — Safe page fetcher with SSRF protection
// ============================================================
// Validates resolved IPs against private/reserved ranges, enforces
// timeout / size limits, and retries with exponential backoff.
// ============================================================

import { createLogger } from './logger';
import dns from 'node:dns/promises';

const log = createLogger('fetcher');

// ── Configuration ───────────────────────────────────────────

const USER_AGENT = 'WebMonitor/1.0 (+https://webmonitor.app/bot)';
const TIMEOUT_MS = 15_000;           // 15-second hard timeout
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_RETRIES = 2;               // total attempts = 1 + MAX_RETRIES = 3
const BACKOFF_DELAYS = [1_000, 3_000]; // ms between retries

// ── SSRF Private IP ranges ─────────────────────────────────
// We check the DNS-resolved IP before opening a connection.
// This prevents request smuggling through DNS rebinding to
// internal services or cloud metadata endpoints.

/**
 * Returns true if the IPv4 string falls within a blocked range.
 * Ranges: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12,
 *         192.168.0.0/16, 169.254.0.0/16, 0.0.0.0/8
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return true; // malformed → block

  const [a, b] = parts;

  return (
    a === 127 ||                            // 127.0.0.0/8  loopback
    a === 10 ||                             // 10.0.0.0/8   private
    (a === 172 && b >= 16 && b <= 31) ||    // 172.16.0.0/12 private
    (a === 192 && b === 168) ||             // 192.168.0.0/16 private
    (a === 169 && b === 254) ||             // 169.254.0.0/16 link-local + cloud metadata
    a === 0                                 // 0.0.0.0/8
  );
}

/** Blocked IPv6 addresses. */
const BLOCKED_IPV6 = new Set(['::1', '::ffff:127.0.0.1', 'fe80::1', '::']);

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (BLOCKED_IPV6.has(normalized)) return true;
  // Block link-local (fe80::/10) and unique-local (fc00::/7)
  if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // Block IPv4-mapped IPv6 that maps to a private v4
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.slice(7);
    if (v4Part.includes('.')) return isPrivateIPv4(v4Part);
  }
  return false;
}

/**
 * Resolves hostname via DNS and validates all IPs are public.
 * Throws if any resolved address is private/reserved.
 */
async function validateUrl(url: string): Promise<void> {
  const parsed = new URL(url);

  // Only HTTP(S) allowed
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Blocked protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname;

  // If the hostname is already an IP literal, check it directly
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new Error(`SSRF blocked: ${hostname} is a private IP`);
    }
    return;
  }

  // DNS lookup — resolve ALL addresses and block if any are private.
  // This mitigates DNS rebinding where a name resolves to both a
  // public and a private IP depending on timing.
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const record of addresses) {
      const ip = record.address;
      if (isPrivateIPv4(ip) || isPrivateIPv6(ip)) {
        throw new Error(`SSRF blocked: ${hostname} resolves to private IP ${ip}`);
      }
    }
  } catch (err: unknown) {
    // Re-throw our own SSRF errors, but wrap DNS failures
    if (err instanceof Error && err.message.startsWith('SSRF blocked')) throw err;
    throw new Error(`DNS resolution failed for ${hostname}: ${(err as Error).message}`);
  }

  // Extra guard: block the well-known cloud metadata IP explicitly
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    throw new Error(`SSRF blocked: cloud metadata endpoint ${hostname}`);
  }
}

// ── Fetch with size guard ───────────────────────────────────

/**
 * Streams the response body and aborts if it exceeds MAX_BODY_BYTES.
 * Returns the full body as a UTF-8 string.
 */
async function readBodyWithLimit(response: Response, signal: AbortSignal): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response has no readable body');

  const decoder = new TextDecoder('utf-8');
  const chunks: string[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      if (signal.aborted) throw new Error('Request timed out');

      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        reader.cancel();
        throw new Error(`Response too large: exceeded ${MAX_BODY_BYTES / 1024 / 1024} MB limit`);
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }

  return chunks.join('');
}

// ── Public API ──────────────────────────────────────────────

/** Options accepted by fetchPage. */
export interface FetchOptions {
  /** URL to fetch. */
  url: string;
  /** Render mode — only 'html' is supported in Phase 1. */
  renderMode: 'html' | 'browser';
}

/** Successful fetch result. */
export interface FetchResult {
  html: string;
  statusCode: number;
  fetchedAt: Date;
  durationMs: number;
}

/**
 * Fetches the page at `url` with safety guards:
 * 1. SSRF validation (DNS check against private IP ranges)
 * 2. 15-second timeout via AbortController
 * 3. 5 MB max body size
 * 4. 2 retries with exponential backoff (1 s, 3 s)
 *
 * @throws Error if all attempts fail or URL is blocked
 */
export async function fetchPage(opts: FetchOptions): Promise<FetchResult> {
  const { url, renderMode } = opts;

  if (renderMode === 'browser') {
    // Phase 2 — headless browser rendering (Puppeteer / Playwright)
    throw new Error('Browser rendering is not supported yet (Phase 2)');
  }

  // ── SSRF check (done once, before any retry) ──
  await validateUrl(url);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Wait before retry (skip on first attempt)
    if (attempt > 0) {
      const delay = BACKOFF_DELAYS[attempt - 1] ?? 3_000;
      log.debug(`Retry ${attempt}/${MAX_RETRIES} after ${delay}ms`, { url });
      await new Promise((r) => setTimeout(r, delay));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow', // follow up to 20 redirects (Node default)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const html = await readBodyWithLimit(response, controller.signal);
      const durationMs = Date.now() - start;

      log.debug(`Fetched ${url} in ${durationMs}ms (${(html.length / 1024).toFixed(1)} KB)`);

      return {
        html,
        statusCode: response.status,
        fetchedAt: new Date(),
        durationMs,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on SSRF blocks or size violations — they'll fail again
      if (
        lastError.message.startsWith('SSRF blocked') ||
        lastError.message.includes('exceeded')
      ) {
        throw lastError;
      }

      log.warn(`Fetch attempt ${attempt + 1} failed: ${lastError.message}`, { url });
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url} after ${MAX_RETRIES + 1} attempts`);
}
