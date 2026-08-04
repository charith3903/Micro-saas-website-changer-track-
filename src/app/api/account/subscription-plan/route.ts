import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { SUBSCRIPTION_TRACKER_PLANS, getSubscriptionTrackerPlanConfig } from '@/lib/plans';

// ============================================================
// PUT /api/account/subscription-plan — self-serve plan switch
// for the Subscription & Trial Reminder product (independent
// from the website-monitor plan in /api/account/plan).
// ============================================================
// No payment processor is wired up yet — this changes the plan
// immediately. Kept honest in the UI copy: "no payment collected."
// ============================================================
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body as { plan?: string };

    if (!plan || !SUBSCRIPTION_TRACKER_PLANS[plan]) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
    }

    if (plan === user.subscription_tracker_plan) {
      return NextResponse.json({ user: { subscription_tracker_plan: user.subscription_tracker_plan } });
    }

    const newConfig = getSubscriptionTrackerPlanConfig(plan);
    if (newConfig.maxTrackedSubscriptions !== null) {
      const countResult = await queryOne<{ count: string }>(
        "SELECT COUNT(*) as count FROM tracked_subscriptions WHERE user_id = $1 AND status = 'active'",
        [user.id]
      );
      const currentCount = parseInt(countResult?.count || '0', 10);

      if (currentCount > newConfig.maxTrackedSubscriptions) {
        return NextResponse.json(
          {
            error: `You have ${currentCount} active subscriptions tracked, but the ${newConfig.name} plan allows up to ${newConfig.maxTrackedSubscriptions}. Remove some first.`,
          },
          { status: 409 }
        );
      }
    }

    const updated = await queryOne<{ id: string; email: string; subscription_tracker_plan: string }>(
      'UPDATE users SET subscription_tracker_plan = $1 WHERE id = $2 RETURNING id, email, subscription_tracker_plan',
      [plan, user.id]
    );

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('[Account] Subscription plan change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
