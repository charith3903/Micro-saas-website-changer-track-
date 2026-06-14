// ============================================================
// worker/alerter.ts — Send change notifications & persist alerts
// ============================================================
// Uses Resend SDK for email delivery. Falls back to console.log
// when RESEND_API_KEY is unset (dev mode).
// Records every alert in the `alerts` table for audit/history.
// ============================================================

import { Resend } from 'resend';
import type { Pool } from 'pg';
import { createLogger } from './logger';
import type { ChangeResult } from './detector';

const log = createLogger('alerter');

// ── Types ───────────────────────────────────────────────────

/** The subset of monitor fields the alerter needs. */
export interface MonitorForAlert {
  id: string;
  user_id: string;
  name: string | null;
  url: string;
  type: string;
  notify_email: boolean;
  notify_telegram: boolean;
}

/** Payload shape stored as JSONB in the alerts table. */
interface AlertPayload {
  monitor_name: string;
  monitor_url: string;
  monitor_type: string;
  diff: string | null;
  checked_at: string;
}

// ── Resend client (lazy-init) ───────────────────────────────

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log.warn('RESEND_API_KEY not set — email alerts will be logged to console');
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

// ── Email builder ───────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL ?? 'WebMonitor <alerts@webmonitor.app>';

/**
 * Builds the HTML email body for a change alert.
 * Keeps it simple — no external CSS, works in all email clients.
 */
function buildEmailHtml(
  monitor: MonitorForAlert,
  change: ChangeResult,
): string {
  const monitorName = monitor.name ?? monitor.url;
  const dashboardUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;
  const diff = change.diff ?? 'No diff details available';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #2563eb; margin-bottom: 4px;">🔔 Change Detected</h2>
  <p style="color: #666; margin-top: 0;">
    <strong>${escapeHtml(monitorName)}</strong>
  </p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">URL</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">
        <a href="${escapeHtml(monitor.url)}" style="color: #2563eb;">${escapeHtml(monitor.url)}</a>
      </td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Type</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${escapeHtml(monitor.type)}</td>
    </tr>
  </table>

  <h3 style="margin-bottom: 8px;">What changed:</h3>
  <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.5; border: 1px solid #e2e8f0;">${escapeHtml(diff)}</pre>

  <p style="margin-top: 24px;">
    <a href="${escapeHtml(dashboardUrl)}"
       style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
      View in Dashboard →
    </a>
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
  <p style="font-size: 12px; color: #94a3b8;">
    Sent by <a href="${APP_URL}" style="color: #64748b;">WebMonitor</a>.
    You can manage notification settings in your dashboard.
  </p>
</body>
</html>`.trim();
}

/** Minimal HTML escaping for safe template insertion. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Alert recording ─────────────────────────────────────────

/**
 * Persists an alert record to the `alerts` table.
 * This runs regardless of whether the email was actually sent
 * so we have a full audit trail.
 */
async function recordAlert(
  pool: Pool,
  monitor: MonitorForAlert,
  channel: 'email' | 'telegram' | 'webhook',
  payload: AlertPayload,
  delivered: boolean,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO alerts (monitor_id, user_id, channel, payload, delivered)
       VALUES ($1, $2, $3, $4, $5)`,
      [monitor.id, monitor.user_id, channel, JSON.stringify(payload), delivered],
    );
    log.debug(`Alert recorded in DB for monitor ${monitor.id}`);
  } catch (err) {
    // Don't let a DB write failure crash the whole check pipeline.
    // The alert was still sent (or logged), so this is non-critical.
    log.error('Failed to record alert in database', err);
  }
}

// ── Public API ──────────────────────────────────────────────

/**
 * Sends an alert for a detected change.
 *
 * Flow:
 * 1. Build email HTML
 * 2. Send via Resend (or log to console if no API key)
 * 3. Record in alerts table
 *
 * @param pool    - Database connection pool
 * @param monitor - Monitor that detected the change
 * @param change  - Change detection result (with diff)
 * @param userEmail - Email address to send to
 */
export async function sendAlert(
  pool: Pool,
  monitor: MonitorForAlert,
  change: ChangeResult,
  userEmail: string,
): Promise<void> {
  const monitorName = monitor.name ?? monitor.url;
  const payload: AlertPayload = {
    monitor_name: monitorName,
    monitor_url: monitor.url,
    monitor_type: monitor.type,
    diff: change.diff ?? null,
    checked_at: new Date().toISOString(),
  };

  // ── Email alert ──
  if (monitor.notify_email) {
    const subject = `Change detected: ${monitorName}`;
    const html = buildEmailHtml(monitor, change);

    const resend = getResendClient();

    if (resend) {
      // Production path — send via Resend
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [userEmail],
          subject,
          html,
        });
        log.info(`Email alert sent to ${userEmail} for "${monitorName}"`);
        await recordAlert(pool, monitor, 'email', payload, true);
      } catch (err) {
        log.error(`Failed to send email alert to ${userEmail}`, err);
        await recordAlert(pool, monitor, 'email', payload, false);
      }
    } else {
      // Dev fallback — log to console so developers can see what *would* be sent
      log.info('═══════════════════════════════════════════════════');
      log.info(`📧 EMAIL ALERT (dev mode — no RESEND_API_KEY)`);
      log.info(`   To:      ${userEmail}`);
      log.info(`   Subject: ${subject}`);
      log.info(`   Monitor: ${monitorName}`);
      log.info(`   URL:     ${monitor.url}`);
      log.info(`   Diff:    ${change.diff ?? 'N/A'}`);
      log.info('═══════════════════════════════════════════════════');
      await recordAlert(pool, monitor, 'email', payload, true);
    }
  }

  // ── Telegram alert (Phase 2) ──
  if (monitor.notify_telegram) {
    log.warn('Telegram alerts not implemented yet (Phase 2)');
    // TODO: Send via Telegram Bot API using the user's telegram_chat_id
  }
}

/**
 * Sends a one-time notification when a monitor is auto-paused
 * due to consecutive errors.
 */
export async function sendErrorAlert(
  pool: Pool,
  monitor: MonitorForAlert,
  errorReason: string,
  userEmail: string,
): Promise<void> {
  const monitorName = monitor.name ?? monitor.url;
  const subject = `Monitor paused: ${monitorName}`;
  const dashboardUrl = `${APP_URL}/dashboard/monitors/${monitor.id}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #dc2626;">⚠️ Monitor Paused Due to Errors</h2>
  <p><strong>${escapeHtml(monitorName)}</strong> has been automatically paused after 3 consecutive failures.</p>

  <h3 style="margin-bottom: 8px;">Error:</h3>
  <pre style="background: #fef2f2; padding: 16px; border-radius: 8px; white-space: pre-wrap; word-break: break-word; font-size: 13px; border: 1px solid #fecaca; color: #991b1b;">${escapeHtml(errorReason)}</pre>

  <p>
    <a href="${escapeHtml(dashboardUrl)}"
       style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
      Review & Reactivate →
    </a>
  </p>
</body>
</html>`.trim();

  const resend = getResendClient();
  if (resend) {
    try {
      await resend.emails.send({ from: FROM_EMAIL, to: [userEmail], subject, html });
      log.info(`Error alert sent to ${userEmail} for "${monitorName}"`);
    } catch (err) {
      log.error(`Failed to send error alert to ${userEmail}`, err);
    }
  } else {
    log.info('═══════════════════════════════════════════════════');
    log.info(`⚠️  ERROR ALERT (dev mode — no RESEND_API_KEY)`);
    log.info(`   To:      ${userEmail}`);
    log.info(`   Monitor: ${monitorName} has been PAUSED`);
    log.info(`   Reason:  ${errorReason}`);
    log.info('═══════════════════════════════════════════════════');
  }
}
