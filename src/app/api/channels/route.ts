import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryAll, queryOne } from '@/lib/db';
import { validateUrlFormat } from '@/lib/ssrf';
import { canUseChannel } from '@/lib/plans';
import type { NotificationChannel } from '@/lib/types';

// ============================================================
// GET /api/channels — list the user's notification channels
// ============================================================
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channels = await queryAll<NotificationChannel>(
      'SELECT * FROM notification_channels WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('[Channels] List error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// POST /api/channels — add a webhook notification channel
// ============================================================
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, destination } = body as { type?: string; destination?: string };

    if (type !== 'webhook') {
      return NextResponse.json({ error: 'Only webhook channels can be added right now' }, { status: 400 });
    }

    if (!canUseChannel(user.plan, 'webhook')) {
      return NextResponse.json(
        { error: 'Webhook alerts require a Pro plan. Upgrade in Settings to unlock this.' },
        { status: 403 }
      );
    }

    if (!destination) {
      return NextResponse.json({ error: 'A destination URL is required' }, { status: 400 });
    }

    // Webhook destinations are user-supplied URLs the worker will POST to —
    // apply the same SSRF protection monitors get, since this is just as
    // capable of reaching internal infrastructure.
    const validation = validateUrlFormat(destination);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const existingCount = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM notification_channels WHERE user_id = $1 AND type = 'webhook'",
      [user.id]
    );
    if (parseInt(existingCount?.count || '0', 10) >= 3) {
      return NextResponse.json({ error: 'You can configure up to 3 webhook URLs' }, { status: 403 });
    }

    // No out-of-band verification flow for webhooks in this version — the
    // "Send test" action lets the user confirm it's wired up correctly.
    const channel = await queryOne<NotificationChannel>(
      `INSERT INTO notification_channels (user_id, type, destination, verified)
       VALUES ($1, 'webhook', $2, true)
       RETURNING *`,
      [user.id, destination]
    );

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error('[Channels] Create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
