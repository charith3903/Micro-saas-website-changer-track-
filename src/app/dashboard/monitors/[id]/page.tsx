'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

interface Monitor {
  id: string;
  name: string | null;
  url: string;
  type: string;
  status: 'active' | 'paused' | 'error';
  error_reason: string | null;
  last_checked_at: string | null;
  last_value: string | null;
  render_mode: string;
  created_at: string;
}

interface Check {
  id: string;
  checked_at: string;
  status: 'ok' | 'error';
  changed: boolean;
  duration_ms: number | null;
  error_message: string | null;
}

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'error'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  paused: { variant: 'warning', label: 'Paused' },
  error: { variant: 'error', label: 'Error' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString();
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="glass-card p-6">
        <div className="h-6 bg-slate-700/50 rounded-lg w-1/3 mb-4" />
        <div className="h-4 bg-slate-700/30 rounded-lg w-2/3 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-3 bg-slate-700/30 rounded w-16 mb-2" />
              <div className="h-4 bg-slate-700/40 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card p-6">
        <div className="h-5 bg-slate-700/50 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-700/20 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MonitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = params.id as string;

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [showValue, setShowValue] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/monitors/${id}`);
      if (!res.ok) throw new Error('Failed to fetch monitor');
      const data = await res.json();
      setMonitor(data.monitor);
      setChecks(data.checks || []);
    } catch {
      addToast({ type: 'error', message: 'Failed to load monitor details.' });
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  const handlePauseResume = async () => {
    if (!monitor) return;
    const newStatus = monitor.status === 'active' ? 'paused' : 'active';
    setActionLoading('pause');
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update monitor');
      setMonitor((prev) => prev ? { ...prev, status: newStatus } : prev);
      addToast({
        type: 'success',
        message: `Monitor ${newStatus === 'paused' ? 'paused' : 'resumed'} successfully.`,
      });
    } catch {
      addToast({ type: 'error', message: 'Failed to update monitor status.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckNow = async () => {
    setActionLoading('check');
    try {
      const res = await fetch(`/api/monitors/${id}/check`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to trigger check');
      addToast({ type: 'success', message: 'Check triggered! Refreshing results...' });
      setTimeout(() => fetchData(), 2500);
    } catch {
      addToast({ type: 'error', message: 'Failed to trigger check.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this monitor and all its history?')) return;
    setActionLoading('delete');
    try {
      const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete monitor');
      addToast({ type: 'success', message: 'Monitor deleted successfully.' });
      router.push('/dashboard');
    } catch {
      addToast({ type: 'error', message: 'Failed to delete monitor.' });
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="page-enter">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="page-enter text-center py-20">
        <h2 className="text-xl font-semibold text-white mb-2">Monitor not found</h2>
        <p className="text-slate-400 mb-6">This monitor may have been deleted.</p>
        <Link href="/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[monitor.status] || statusConfig.active;

  return (
    <div className="page-enter">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Monitor Info Card */}
      <Card className="glass-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-white">
                {monitor.name || 'Unnamed Monitor'}
              </h1>
              <Badge variant={status.variant} dot>
                {status.label}
              </Badge>
            </div>
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors break-all"
            >
              {monitor.url}
              <svg className="w-3.5 h-3.5 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePauseResume}
              disabled={actionLoading === 'pause'}
            >
              {monitor.status === 'active' ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Resume
                </>
              )}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCheckNow}
              isLoading={actionLoading === 'check'}
              disabled={actionLoading === 'check'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Now
            </Button>
            <Button variant="ghost" size="sm" disabled>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={actionLoading === 'delete'}
              disabled={actionLoading === 'delete'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          </div>
        </div>

        {/* Error reason */}
        {monitor.status === 'error' && monitor.error_reason && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-sm text-rose-400">
              <span className="font-semibold">Error:</span> {monitor.error_reason}
            </p>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/30">
            <p className="text-xs text-slate-500 mb-1">Type</p>
            <p className="text-sm font-medium text-slate-200 capitalize">{monitor.type}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/30">
            <p className="text-xs text-slate-500 mb-1">Render Mode</p>
            <p className="text-sm font-medium text-slate-200 capitalize">{monitor.render_mode}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/30">
            <p className="text-xs text-slate-500 mb-1">Created</p>
            <p className="text-sm font-medium text-slate-200">{formatDate(monitor.created_at)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/30">
            <p className="text-xs text-slate-500 mb-1">Last Checked</p>
            <p className="text-sm font-medium text-slate-200">{formatDate(monitor.last_checked_at)}</p>
          </div>
        </div>
      </Card>

      {/* Last Observed Value — Collapsible */}
      {monitor.last_value && (
        <Card className="glass-card mb-6 overflow-hidden">
          <button
            onClick={() => setShowValue(!showValue)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-700/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-white">Last Observed Value</span>
              <Badge variant="info">
                {monitor.last_value.length} chars
              </Badge>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showValue ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showValue && (
            <div className="px-5 pb-5">
              <pre className="text-xs text-slate-400 bg-slate-900/50 rounded-xl p-4 overflow-x-auto max-h-64 border border-slate-700/30 whitespace-pre-wrap break-all">
                {monitor.last_value.slice(0, 500)}
                {monitor.last_value.length > 500 && (
                  <span className="text-slate-600">
                    {'\n'}... ({monitor.last_value.length - 500} more characters)
                  </span>
                )}
              </pre>
            </div>
          )}
        </Card>
      )}

      {/* Check History */}
      <Card className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-semibold text-white">Check History</h2>
            <Badge variant="default">{checks.length} checks</Badge>
          </div>
        </div>

        {checks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No checks recorded yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Trigger a manual check or wait for the next scheduled run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    Time
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    Changed
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {checks.map((check) => (
                  <tr
                    key={check.id}
                    className="hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-slate-300 whitespace-nowrap">
                      {formatDate(check.checked_at)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={check.status === 'ok' ? 'success' : 'error'}>
                        {check.status === 'ok' ? 'OK' : 'Error'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {check.changed ? (
                        <Badge variant="info">Yes</Badge>
                      ) : (
                        <Badge variant="default">No</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-400 whitespace-nowrap font-mono">
                      {formatDuration(check.duration_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
