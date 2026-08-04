// ============================================================
// worker/subscriptionReminder.ts — Subscription & trial reminders
// ============================================================
// A second, independent product in the same account: remind users
// before a tracked subscription renews or a free trial ends.
//
// Runs on its own hourly cron (see startSubscriptionReminderScheduler
// below) — day-granularity reminders don't need the 30-second cadence
// the website-check scheduler uses, and a slower tick self-heals if
// the worker was down when a reminder was due.
// ============================================================

import cron from 'node-cron';
import type { Pool } from 'pg';
import { createLogger } from './logger';
import { getResendClient, escapeHtml, APP_URL, FROM_EMAIL } from './alerter';

const log = createLogger('subscription-reminder');

interface DueSubscription {
  id: string;
  user_id: string;
  user_email: string;
  name: string;
  is_trial: boolean;
  amount: string | null; // DECIMAL comes as string from pg
  currency: string;
  billing_cycle: string;
  next_renewal_date: string;
  reminder_days_before: number;
}

// ── Email ────────────────────────────────────────────────────

function buildReminderEmail(sub: DueSubscription): { subject: string; html: string } {
  const renewalDate = new Date(sub.next_renewal_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const amountText = sub.amount != null ? `${sub.currency} ${Number(sub.amount).toFixed(2)}` : null;
  const verb = sub.is_trial ? 'ends' : 'renews';
  const subject = `${sub.is_trial ? 'Trial ending soon' : 'Renewal coming up'}: ${sub.name}`;
  const dashboardUrl = `${APP_URL}/dashboard/subscriptions`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: ${sub.is_trial ? '#d97706' : '#2563eb'}; margin-bottom: 4px;">
    ${sub.is_trial ? '⏰ Trial ending soon' : '🔔 Renewal coming up'}
  </h2>
  <p style="font-size: 16px;">
    <strong>${escapeHtml(sub.name)}</strong> ${verb} on <strong>${renewalDate}</strong>.
  </p>
  ${amountText ? `<p style="color: #666;">Amount: <strong>${escapeHtml(amountText)}</strong></p>` : ''}
  <p style="color: #666;">
    ${sub.is_trial
      ? "If you don't want to be charged, cancel before this date."
      : 'Cancel now if you no longer need this subscription.'}
  </p>
  <p style="margin-top: 24px;">
    <a href="${escapeHtml(dashboardUrl)}"
       style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
      View my subscriptions →
    </a>
  </p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
  <p style="font-size: 12px; color: #94a3b8;">
    Sent by <a href="${APP_URL}" style="color: #64748b;">WebMonitor</a> — you can stop tracking this
    anytime from your dashboard.
  </p>
</body>
</html>`.trim();

  return { subject, html };
}

async function sendReminderEmail(sub: DueSubscription): Promise<void> {
  const { subject, html } = buildReminderEmail(sub);
  const resend = getResendClient();

  if (resend) {
    try {
      await resend.emails.send({ from: FROM_EMAIL, to: [sub.user_email], subject, html });
      log.info(`Reminder sent to ${sub.user_email} for "${sub.name}"`);
    } catch (err) {
      log.error(`Failed to send reminder to ${sub.user_email} for "${sub.name}"`, err);
    }
  } else {
    log.info('═══════════════════════════════════════════════════');
    log.info(`📧 SUBSCRIPTION REMINDER (dev mode — no RESEND_API_KEY)`);
    log.info(`   To:      ${sub.user_email}`);
    log.info(`   Subject: ${subject}`);
    log.info(`   Item:    ${sub.name} (${sub.is_trial ? 'trial' : sub.billing_cycle})`);
    log.info(`   Date:    ${sub.next_renewal_date}`);
    log.info('═══════════════════════════════════════════════════');
  }
}

// ── Tick ─────────────────────────────────────────────────────

/**
 * Single tick:
 * 1. Roll forward recurring subscriptions whose renewal date has passed,
 *    and expire one-time (trial) entries whose end date has passed.
 * 2. Send reminders for anything due within its configured lead time
 *    that hasn't already been reminded for this specific renewal date.
 */
export async function runReminderTick(pool: Pool): Promise<void> {
  try {
    const advanced = await pool.query(
      `UPDATE tracked_subscriptions
       SET next_renewal_date = next_renewal_date + CASE billing_cycle
             WHEN 'weekly' THEN INTERVAL '7 days'
             WHEN 'monthly' THEN INTERVAL '1 month'
             WHEN 'quarterly' THEN INTERVAL '3 months'
             WHEN 'yearly' THEN INTERVAL '1 year'
           END,
           last_reminded_for_date = NULL
       WHERE status = 'active' AND billing_cycle != 'one_time' AND next_renewal_date < CURRENT_DATE`
    );
    if ((advanced.rowCount ?? 0) > 0) {
      log.info(`Rolled forward ${advanced.rowCount} recurring subscription(s) to their next cycle`);
    }

    const expired = await pool.query(
      `UPDATE tracked_subscriptions
       SET status = 'expired'
       WHERE status = 'active' AND billing_cycle = 'one_time' AND next_renewal_date < CURRENT_DATE`
    );
    if ((expired.rowCount ?? 0) > 0) {
      log.info(`Marked ${expired.rowCount} past-due trial(s)/one-time item(s) as expired`);
    }
  } catch (err) {
    log.error('Failed to roll forward / expire due subscriptions', err);
    return;
  }

  let due: DueSubscription[];
  try {
    const result = await pool.query<DueSubscription>(
      `SELECT ts.id, ts.user_id, u.email AS user_email, ts.name, ts.is_trial, ts.amount,
              ts.currency, ts.billing_cycle, ts.next_renewal_date, ts.reminder_days_before
       FROM tracked_subscriptions ts
       JOIN users u ON u.id = ts.user_id
       WHERE ts.status = 'active'
         AND ts.next_renewal_date >= CURRENT_DATE
         AND (ts.next_renewal_date - make_interval(days => ts.reminder_days_before)) <= CURRENT_DATE
         AND (ts.last_reminded_for_date IS NULL OR ts.last_reminded_for_date != ts.next_renewal_date)
       LIMIT 200`
    );
    due = result.rows;
  } catch (err) {
    log.error('Failed to query due subscription reminders', err);
    return;
  }

  if (due.length === 0) {
    log.debug('No subscription reminders due');
    return;
  }

  log.info(`Sending ${due.length} subscription reminder(s)`);

  for (const sub of due) {
    await sendReminderEmail(sub);
    try {
      await pool.query(
        'UPDATE tracked_subscriptions SET last_reminded_for_date = next_renewal_date WHERE id = $1',
        [sub.id]
      );
    } catch (err) {
      log.error(`Failed to mark reminder as sent for "${sub.name}"`, err);
    }
  }
}

// ── Public API ──────────────────────────────────────────────

export interface SubscriptionReminderHandle {
  stop: () => void;
}

export function startSubscriptionReminderScheduler(pool: Pool): SubscriptionReminderHandle {
  log.info('Starting subscription reminder scheduler — ticking hourly');

  let isProcessing = false;

  const job = cron.schedule('0 * * * *', async () => {
    if (isProcessing) {
      log.warn('Previous reminder tick still running — skipping this tick');
      return;
    }
    isProcessing = true;
    try {
      await runReminderTick(pool);
    } catch (err) {
      log.error('Unhandled error in subscription reminder tick', err);
    } finally {
      isProcessing = false;
    }
  });

  return {
    stop: () => {
      log.info('Stopping subscription reminder scheduler');
      job.stop();
    },
  };
}
