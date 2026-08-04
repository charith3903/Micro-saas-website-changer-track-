import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { PLANS, getPlanConfig } from '@/lib/plans';

// ============================================================
// PUT /api/account/plan — self-serve plan switch
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

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
    }

    if (plan === user.plan) {
      return NextResponse.json({ user: { plan: user.plan } });
    }

    const newConfig = getPlanConfig(plan);
    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM monitors WHERE user_id = $1',
      [user.id]
    );
    const currentCount = parseInt(countResult?.count || '0', 10);

    if (currentCount > newConfig.maxMonitors) {
      return NextResponse.json(
        {
          error: `You have ${currentCount} monitors, but the ${newConfig.name} plan allows up to ${newConfig.maxMonitors}. Delete some monitors first.`,
        },
        { status: 409 }
      );
    }

    const updated = await queryOne<{ id: string; email: string; plan: string }>(
      'UPDATE users SET plan = $1 WHERE id = $2 RETURNING id, email, plan',
      [plan, user.id]
    );

    // Any monitor checking faster than the new plan's floor gets slowed down
    // to stay within the new plan's limits.
    await query(
      `UPDATE monitors SET interval_seconds = $1
       WHERE user_id = $2 AND interval_seconds < $1`,
      [newConfig.minIntervalSeconds, user.id]
    );

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('[Account] Plan change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
