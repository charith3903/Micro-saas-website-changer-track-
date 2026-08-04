import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryAll } from '@/lib/db';

interface AlertRow {
  id: string;
  monitor_id: string;
  monitor_name: string | null;
  monitor_url: string;
  channel: 'email' | 'telegram' | 'webhook';
  sent_at: string;
  delivered: boolean;
  payload: { diff: string | null };
}

// ============================================================
// GET /api/alerts — every alert ever sent for the user's monitors
// ============================================================
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts = await queryAll<AlertRow>(
      `SELECT a.id, a.monitor_id, m.name AS monitor_name, m.url AS monitor_url,
              a.channel, a.sent_at, a.delivered, a.payload
       FROM alerts a
       JOIN monitors m ON m.id = a.monitor_id
       WHERE a.user_id = $1
       ORDER BY a.sent_at DESC
       LIMIT 100`,
      [user.id]
    );

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('[Alerts] List error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
