'use client';

import React from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Favicon from '@/components/ui/Favicon';

interface MonitorCardProps {
  monitor: {
    id: string;
    name: string | null;
    url: string;
    type: string;
    status: 'active' | 'paused' | 'error';
    error_reason: string | null;
    last_checked_at: string | null;
    render_mode: string;
    created_at: string;
  };
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onCheckNow: (id: string) => void;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString();
}

const statusConfig: Record<
  string,
  { variant: 'success' | 'warning' | 'error'; label: string; accent: string }
> = {
  active: { variant: 'success', label: 'Active', accent: 'bg-emerald-500' },
  paused: { variant: 'warning', label: 'Paused', accent: 'bg-amber-500' },
  error: { variant: 'error', label: 'Error', accent: 'bg-rose-500' },
};

const typeLabels: Record<string, string> = {
  full_page: 'Full Page',
  css_selector: 'CSS Selector',
  keyword_appears: 'Keyword Appears',
  keyword_disappears: 'Keyword Disappears',
  price_drop: 'Price Drop',
};

function truncateUrl(url: string, maxLen = 40): string {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > maxLen ? display.slice(0, maxLen) + '…' : display;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + '…' : url;
  }
}

export default function MonitorCard({
  monitor,
  onPause,
  onResume,
  onDelete,
  onCheckNow,
}: MonitorCardProps) {
  const status = statusConfig[monitor.status] || statusConfig.active;

  return (
    <Card className="group relative overflow-hidden hover:border-slate-600/50 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300">
      {/* Status accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${status.accent}`} />

      <div className="p-5">
        {/* Top row: favicon + Name/URL + Status badge */}
        <Link
          href={`/dashboard/monitors/${monitor.id}`}
          className="flex items-start justify-between gap-3 mb-3 -m-1 p-1 rounded-lg hover:bg-slate-700/20 transition-colors"
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Favicon url={monitor.url} size={32} className="w-8 h-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-white font-semibold truncate text-sm group-hover:text-indigo-300 transition-colors">
                {monitor.name || truncateUrl(monitor.url, 50)}
              </h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {truncateUrl(monitor.url)}
              </p>
            </div>
          </div>
          <Badge variant={status.variant} dot className="shrink-0">
            {status.label}
          </Badge>
        </Link>

        {/* Error reason */}
        {monitor.status === 'error' && monitor.error_reason && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <p className="text-xs text-rose-400 line-clamp-2">{monitor.error_reason}</p>
          </div>
        )}

        {/* Meta info row */}
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5" title="Last checked">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{timeAgo(monitor.last_checked_at)}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Monitor type">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span className="truncate">{typeLabels[monitor.type] || monitor.type}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700/50 pt-3">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {monitor.status === 'active' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPause(monitor.id)}
                aria-label="Pause monitor"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResume(monitor.id)}
                aria-label="Resume monitor"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCheckNow(monitor.id)}
              aria-label="Check now"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Now
            </Button>
            <div className="flex-1" />
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
              aria-label="Open site in new tab"
              title="Open site"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(monitor.id)}
              className="!px-2 text-slate-500 hover:!text-rose-400 hover:!bg-rose-500/10"
              aria-label="Delete monitor"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
