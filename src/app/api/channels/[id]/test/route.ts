import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { validateUrlDns } from '@/lib/ssrf';
import type { NotificationChannel } from '@/lib/types';

// ============================================================
// POST /api/channels/[id]/test — send a sample payload immediately
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

    const channel = await queryOne<NotificationChannel>(
      'SELECT * FROM notification_channels WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Re-check at send time — DNS may have changed since the channel was added.
    const dnsCheck = await validateUrlDns(channel.destination);
    if (!dnsCheck.valid) {
      return NextResponse.json({ error: `Cannot reach destination: ${dnsCheck.error}` }, { status: 400 });
    }

    const testPayload = {
      event: 'test',
      message: 'This is a test alert from WebMonitor.',
      sent_at: new Date().toISOString(),
    };

    try {
      const response = await fetch(channel.destination, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });

      return NextResponse.json({
        delivered: response.ok,
        status: response.status,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      return NextResponse.json({ delivered: false, error: message });
    }
  } catch (error) {
    console.error('[Channels] Test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
