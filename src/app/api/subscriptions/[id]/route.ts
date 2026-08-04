import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import type { TrackedSubscription, UpdateTrackedSubscriptionRequest, BillingCycle } from '@/lib/types';

const VALID_CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'one_time'];

// ============================================================
// GET /api/subscriptions/[id] — get a single tracked subscription
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const subscription = await queryOne<TrackedSubscription>(
      'SELECT * FROM tracked_subscriptions WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('[Subscriptions] Get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// PUT /api/subscriptions/[id] — update a tracked subscription
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdateTrackedSubscriptionRequest = await request.json();

    const existing = await queryOne<TrackedSubscription>(
      'SELECT * FROM tracked_subscriptions WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (body.billing_cycle && !VALID_CYCLES.includes(body.billing_cycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
    }
    if (body.next_renewal_date && isNaN(Date.parse(body.next_renewal_date))) {
      return NextResponse.json({ error: 'Invalid renewal date' }, { status: 400 });
    }
    if (body.reminder_days_before !== undefined && (body.reminder_days_before < 0 || body.reminder_days_before > 60)) {
      return NextResponse.json({ error: 'Reminder must be between 0 and 60 days before' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const allowedFields: (keyof UpdateTrackedSubscriptionRequest)[] = [
      'name', 'is_trial', 'amount', 'currency', 'billing_cycle',
      'next_renewal_date', 'reminder_days_before', 'notes', 'status',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    // Renewal date moved forward manually — clear the reminder-sent marker
    // so the new date can trigger its own reminder.
    if (body.next_renewal_date && body.next_renewal_date !== existing.next_renewal_date) {
      updates.push(`last_reminded_for_date = NULL`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ subscription: existing });
    }

    values.push(id);
    values.push(user.id);

    const subscription = await queryOne<TrackedSubscription>(
      `UPDATE tracked_subscriptions SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('[Subscriptions] Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/subscriptions/[id] — stop tracking a subscription
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await query(
      'DELETE FROM tracked_subscriptions WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subscription removed' });
  } catch (error) {
    console.error('[Subscriptions] Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
