import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/db';

// ============================================================
// DELETE /api/channels/[id] — remove a notification channel
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
      'DELETE FROM notification_channels WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Channel removed' });
  } catch (error) {
    console.error('[Channels] Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
