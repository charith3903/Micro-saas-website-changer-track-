import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryAll, queryOne, query } from '@/lib/db';
import { validateUrlFormat } from '@/lib/ssrf';
import { canAddMonitor, getIntervalForPlan } from '@/lib/plans';
import type { Monitor, CreateMonitorRequest } from '@/lib/types';

// ============================================================
// GET /api/monitors — list user's monitors
// ============================================================
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const monitors = await queryAll<Monitor>(
      `SELECT * FROM monitors 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [user.id]
    );

    return NextResponse.json({ monitors });
  } catch (error) {
    console.error('[Monitors] List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/monitors — create a new monitor
// ============================================================
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateMonitorRequest = await request.json();
    const { url, name, type = 'full_page', render_mode = 'html', notify_email = true } = body;

    // Validate URL
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const urlValidation = validateUrlFormat(url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    // Check plan limits
    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM monitors WHERE user_id = $1',
      [user.id]
    );
    const currentCount = parseInt(countResult?.count || '0', 10);

    if (!canAddMonitor(user.plan, currentCount)) {
      return NextResponse.json(
        { error: `You've reached the maximum number of monitors for your ${user.plan} plan. Upgrade to add more.` },
        { status: 403 }
      );
    }

    // Get interval from plan
    const interval_seconds = getIntervalForPlan(user.plan);

    // Create the monitor
    const monitor = await queryOne<Monitor>(
      `INSERT INTO monitors (user_id, name, url, type, render_mode, interval_seconds, notify_email, next_check_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       RETURNING *`,
      [user.id, name || null, url, type, render_mode, interval_seconds, notify_email]
    );

    return NextResponse.json({ monitor }, { status: 201 });
  } catch (error) {
    console.error('[Monitors] Create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
