import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryAll, queryOne, query } from '@/lib/db';
import { validateUrlFormat } from '@/lib/ssrf';
import { canAddMonitor, canUseChannel, getIntervalForPlan, isValidInterval } from '@/lib/plans';
import type { Monitor, CreateMonitorRequest, MonitorType } from '@/lib/types';

const VALID_TYPES: MonitorType[] = [
  'full_page',
  'css_selector',
  'keyword_appears',
  'keyword_disappears',
  'price_drop',
];

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
    const {
      url,
      name,
      type = 'full_page',
      selector = null,
      keyword = null,
      price_threshold = null,
      render_mode = 'html',
      notify_email = true,
      notify_webhook = false,
    } = body;

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

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid monitor type' }, { status: 400 });
    }

    if ((type === 'css_selector' || type === 'price_drop') && !selector?.trim()) {
      return NextResponse.json(
        { error: 'This monitor type requires a CSS selector' },
        { status: 400 }
      );
    }

    if ((type === 'keyword_appears' || type === 'keyword_disappears') && !keyword?.trim()) {
      return NextResponse.json(
        { error: 'This monitor type requires a keyword' },
        { status: 400 }
      );
    }

    if (notify_webhook && !canUseChannel(user.plan, 'webhook')) {
      return NextResponse.json(
        { error: `Webhook alerts require a Pro plan.` },
        { status: 403 }
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

    // Interval: user may pick anything at/slower than their plan's floor
    const requestedInterval = body.interval_seconds;
    const interval_seconds =
      requestedInterval && isValidInterval(user.plan, requestedInterval)
        ? requestedInterval
        : getIntervalForPlan(user.plan);

    // Create the monitor
    const monitor = await queryOne<Monitor>(
      `INSERT INTO monitors (
         user_id, name, url, type, selector, keyword, price_threshold,
         render_mode, interval_seconds, notify_email, notify_webhook, next_check_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
       RETURNING *`,
      [
        user.id,
        name || null,
        url,
        type,
        selector || null,
        keyword || null,
        price_threshold || null,
        render_mode,
        interval_seconds,
        notify_email,
        notify_webhook,
      ]
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
