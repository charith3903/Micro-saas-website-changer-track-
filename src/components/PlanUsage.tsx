import React from 'react';
import Link from 'next/link';
import { getPlanConfig } from '@/lib/plans';

interface PlanUsageProps {
  plan: string;
  count: number;
}

export default function PlanUsage({ plan, count }: PlanUsageProps) {
  const config = getPlanConfig(plan);
  const ratio = config.maxMonitors > 0 ? count / config.maxMonitors : 0;
  const atLimit = count >= config.maxMonitors;
  const nearLimit = !atLimit && ratio >= 0.8;

  const barColor = atLimit ? 'bg-rose-500' : nearLimit ? 'bg-amber-500' : 'bg-indigo-500';
  const textColor = atLimit ? 'text-rose-400' : nearLimit ? 'text-amber-400' : 'text-slate-400';

  return (
    <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
      <div className="min-w-[92px]">
        <p className={`text-xs font-medium ${textColor}`}>
          {count} / {config.maxMonitors} monitors
        </p>
        <div className="w-full h-1.5 rounded-full bg-slate-700/50 mt-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(ratio * 100, 100)}%` }}
          />
        </div>
      </div>
      {atLimit && (
        <Link
          href="/#pricing"
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
        >
          Upgrade →
        </Link>
      )}
    </div>
  );
}
