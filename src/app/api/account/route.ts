import { NextResponse } from 'next/server';
import { getAuthUser, clearAuthCookie } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

// Reasonable IANA timezone allowlist check — full validation via Intl.
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PUT /api/account — update profile settings (timezone)
// ============================================================
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { timezone } = body as { timezone?: string };

    if (!timezone || !isValidTimezone(timezone)) {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
    }

    const updated = await queryOne<{ id: string; email: string; plan: string; timezone: string }>(
      `UPDATE users SET timezone = $1 WHERE id = $2
       RETURNING id, email, plan, timezone`,
      [timezone, user.id]
    );

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('[Account] Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/account — permanently delete the account
// ============================================================
export async function DELETE() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cascades to monitors, checks, alerts, subscriptions, notification_channels
    // via ON DELETE CASCADE foreign keys (db/migrations/001_initial_schema.sql).
    await query('DELETE FROM users WHERE id = $1', [user.id]);

    await clearAuthCookie();

    return NextResponse.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('[Account] Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
