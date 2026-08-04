import React from 'react';

interface CheckLike {
  id: string;
  checked_at: string;
  ok: boolean;
  changed: boolean;
  duration_ms: number | null;
}

interface CheckHistoryStripProps {
  checks: CheckLike[];
}

function barColor(check: CheckLike): string {
  if (!check.ok) return 'bg-rose-500';
  if (check.changed) return 'bg-blue-500';
  return 'bg-emerald-500';
}

function barTitle(check: CheckLike): string {
  const time = new Date(check.checked_at).toLocaleString();
  const state = !check.ok ? 'Error' : check.changed ? 'Change detected' : 'No change';
  const duration = check.duration_ms != null ? ` · ${check.duration_ms}ms` : '';
  return `${time} — ${state}${duration}`;
}

export default function CheckHistoryStrip({ checks }: CheckHistoryStripProps) {
  // API returns newest-first; render oldest -> newest, left -> right.
  const ordered = [...checks].reverse();

  return (
    <div>
      <div className="flex items-end gap-0.5 h-10">
        {ordered.map((check) => (
          <div
            key={check.id}
            title={barTitle(check)}
            className={`flex-1 min-w-[3px] h-full rounded-sm ${barColor(check)} opacity-80 hover:opacity-100 transition-opacity cursor-default`}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-sm bg-emerald-500" />
          No change
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-sm bg-blue-500" />
          Change detected
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-sm bg-rose-500" />
          Error
        </div>
      </div>
    </div>
  );
}
