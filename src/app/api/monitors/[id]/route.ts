import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { queryOne, queryAll, query } from '@/lib/db';
import { validateUrlFormat } from '@/lib/ssrf';
import type { Monitor, Check, UpdateMonitorRequest } from '@/lib/types';

// ============================================================
// GET /api/monitors/[id] — get a single monitor with recent checks
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

    const monitor = await queryOne<Monitor>(
      'SELECT * FROM monitors WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    // Get recent checks
    const checks = await queryAll<Check>(
      `SELECT * FROM checks 
       WHERE monitor_id = $1 
       ORDER BY checked_at DESC 
       LIMIT 50`,
      [id]
    );

    return NextResponse.json({ monitor, checks });
  } catch (error) {
    console.error('[Monitors] Get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/monitors/[id] — update a monitor
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
    const body: UpdateMonitorRequest = await request.json();

    // Verify ownership
    const existing = await queryOne<Monitor>(
      'SELECT * FROM monitors WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    // Validate URL if being updated
    if (body.url) {
      const urlValidation = validateUrlFormat(body.url);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: urlValidation.error },
          { status: 400 }
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const allowedFields: (keyof UpdateMonitorRequest)[] = [
      'name', 'url', 'type', 'selector', 'keyword',
      'price_threshold', 'render_mode', 'notify_email',
      'notify_telegram', 'status',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    // If status is changing to active, clear error state and reset next_check
    if (body.status === 'active') {
      updates.push(`error_reason = NULL`);
      updates.push(`consecutive_errors = 0`);
      updates.push(`next_check_at = now()`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ monitor: existing });
    }

    values.push(id);
    values.push(user.id);

    const monitor = await queryOne<Monitor>(
      `UPDATE monitors SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    return NextResponse.json({ monitor });
  } catch (error) {
    console.error('[Monitors] Update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/monitors/[id] — delete a monitor and its history
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

    // Verify ownership and delete (CASCADE handles checks + alerts)
    const result = await query(
      'DELETE FROM monitors WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Monitor deleted' });
  } catch (error) {
    console.error('[Monitors] Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
