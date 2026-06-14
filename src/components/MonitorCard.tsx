'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

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
  { variant: 'success' | 'warning' | 'error'; label: string }
> = {
  active: { variant: 'success', label: 'Active' },
  paused: { variant: 'warning', label: 'Paused' },
  error: { variant: 'error', label: 'Error' },
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
    <Card hoverable className="p-5 group">
      {/* Top row: Name + Status badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-semibold truncate text-sm">
            {monitor.name || truncateUrl(monitor.url, 50)}
          </h3>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-indigo-400 transition-colors truncate block mt-0.5"
          >
            {truncateUrl(monitor.url)}
          </a>
        </div>
        <Badge variant={status.variant} dot>
          {status.label}
        </Badge>
      </div>

      {/* Error reason */}
      {monitor.status === 'error' && monitor.error_reason && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <p className="text-xs text-rose-400 line-clamp-2">{monitor.error_reason}</p>
        </div>
      )}

      {/* Meta info row */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Checked {timeAgo(monitor.last_checked_at)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span>{monitor.type}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{monitor.render_mode}</span>
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
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Check Now
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(monitor.id)}
            className="text-slate-500 hover:!text-rose-400 hover:!bg-rose-500/10"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>
    </Card>
  );
}
