import React from 'react';
import Card from '@/components/ui/Card';

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  hint?: string;
}

const toneStyles: Record<string, { iconBg: string; iconText: string }> = {
  brand: { iconBg: 'bg-indigo-500/10 border-indigo-500/20', iconText: 'text-indigo-400' },
  success: { iconBg: 'bg-emerald-500/10 border-emerald-500/20', iconText: 'text-emerald-400' },
  warning: { iconBg: 'bg-amber-500/10 border-amber-500/20', iconText: 'text-amber-400' },
  error: { iconBg: 'bg-rose-500/10 border-rose-500/20', iconText: 'text-rose-400' },
  info: { iconBg: 'bg-blue-500/10 border-blue-500/20', iconText: 'text-blue-400' },
  neutral: { iconBg: 'bg-slate-500/10 border-slate-500/20', iconText: 'text-slate-400' },
};

export default function StatTile({ label, value, icon, tone = 'neutral', hint }: StatTileProps) {
  const styles = toneStyles[tone];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{value}</p>
          {hint && <p className="text-xs text-slate-500 mt-1 truncate">{hint}</p>}
        </div>
        <div className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${styles.iconBg} ${styles.iconText}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
