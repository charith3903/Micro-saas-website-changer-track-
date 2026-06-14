import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { validateUrlDns } from '@/lib/ssrf';
import * as cheerio from 'cheerio';
import type { Monitor } from '@/lib/types';

// ============================================================
// POST /api/monitors/[id]/check — trigger an immediate check
// ============================================================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const monitor = await queryOne<Monitor>(
      'SELECT * FROM monitors WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    // SSRF check at fetch time (DNS might have changed)
    const dnsCheck = await validateUrlDns(monitor.url);
    if (!dnsCheck.valid) {
      return NextResponse.json(
        { error: `Cannot fetch URL: ${dnsCheck.error}` },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let observedValue: string;
    let fetchError: string | null = null;

    try {
      // Fetch the page
      const response = await fetch(monitor.url, {
        headers: {
          'User-Agent': 'WebMonitor/1.0 (+https://webmonitor.app/bot)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Extract visible text using cheerio
      const $ = cheerio.load(html);
      $('script, style, nav, header, footer, aside, noscript, iframe').remove();
      observedValue = $('body').text().replace(/\s+/g, ' ').trim();

    } catch (err) {
      fetchError = err instanceof Error ? err.message : 'Unknown fetch error';
      observedValue = '';
    }

    const durationMs = Date.now() - startTime;
    const ok = !fetchError;
    let changed = false;
    let diff: string | null = null;

    // Compare with last value
    if (ok && monitor.last_value !== null) {
      if (observedValue !== monitor.last_value) {
        changed = true;
        // Generate a simple diff summary
        const oldLen = monitor.last_value.length;
        const newLen = observedValue.length;
        diff = `Content changed (${oldLen} → ${newLen} chars)`;
      }
    }

    // Store check result
    await query(
      `INSERT INTO checks (monitor_id, checked_at, ok, observed_value, changed, diff, error, duration_ms)
       VALUES ($1, now(), $2, $3, $4, $5, $6, $7)`,
      [monitor.id, ok, observedValue.substring(0, 10000), changed, diff, fetchError, durationMs]
    );

    // Update monitor
    if (ok) {
      await query(
        `UPDATE monitors 
         SET last_checked_at = now(), 
             last_value = $1,
             next_check_at = now() + interval '1 second' * interval_seconds,
             status = 'active',
             error_reason = NULL,
             consecutive_errors = 0
         WHERE id = $2`,
        [observedValue.substring(0, 50000), monitor.id]
      );
    } else {
      await query(
        `UPDATE monitors 
         SET last_checked_at = now(),
             consecutive_errors = consecutive_errors + 1,
             error_reason = $1
         WHERE id = $2`,
        [fetchError, monitor.id]
      );
    }

    return NextResponse.json({
      ok,
      changed,
      diff,
      error: fetchError,
      duration_ms: durationMs,
      observed_value_preview: observedValue.substring(0, 200),
    });

  } catch (error) {
    console.error('[Monitors] Check now error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
