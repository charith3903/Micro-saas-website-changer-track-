import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryAll, queryOne } from '@/lib/db';
import { canAddTrackedSubscription } from '@/lib/plans';
import type { TrackedSubscription, CreateTrackedSubscriptionRequest, BillingCycle } from '@/lib/types';

const VALID_CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'one_time'];

// ============================================================
// GET /api/subscriptions — list the user's tracked subscriptions
// ============================================================
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await queryAll<TrackedSubscription>(
      `SELECT * FROM tracked_subscriptions
       WHERE user_id = $1
       ORDER BY next_renewal_date ASC`,
      [user.id]
    );

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('[Subscriptions] List error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// POST /api/subscriptions — track a new subscription or trial
// ============================================================
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateTrackedSubscriptionRequest = await request.json();
    const {
      name,
      is_trial = false,
      amount = null,
      currency = 'EUR',
      billing_cycle = 'monthly',
      next_renewal_date,
      reminder_days_before = 3,
      notes = null,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!next_renewal_date || isNaN(Date.parse(next_renewal_date))) {
      return NextResponse.json({ error: 'A valid renewal/trial-end date is required' }, { status: 400 });
    }

    if (!VALID_CYCLES.includes(billing_cycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
    }

    if (reminder_days_before < 0 || reminder_days_before > 60) {
      return NextResponse.json({ error: 'Reminder must be between 0 and 60 days before' }, { status: 400 });
    }

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tracked_subscriptions WHERE user_id = $1',
      [user.id]
    );
    const currentCount = parseInt(countResult?.count || '0', 10);

    if (!canAddTrackedSubscription(user.subscription_tracker_plan, currentCount)) {
      return NextResponse.json(
        {
          error: `You've reached the maximum number of tracked subscriptions for your ${user.subscription_tracker_plan} plan. Upgrade in Settings to track more.`,
        },
        { status: 403 }
      );
    }

    const subscription = await queryOne<TrackedSubscription>(
      `INSERT INTO tracked_subscriptions (
         user_id, name, is_trial, amount, currency, billing_cycle,
         next_renewal_date, reminder_days_before, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        user.id,
        name.trim(),
        is_trial,
        amount,
        currency,
        billing_cycle,
        next_renewal_date,
        reminder_days_before,
        notes,
      ]
    );

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error('[Subscriptions] Create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
