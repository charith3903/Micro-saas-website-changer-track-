'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MonitorCard from '@/components/MonitorCard';
import EmptyState from '@/components/EmptyState';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Monitor {
  id: string;
  name: string | null;
  url: string;
  type: string;
  status: 'active' | 'paused' | 'error';
  error_reason: string | null;
  last_checked_at: string | null;
  render_mode: string;
  created_at: string;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card p-5 animate-pulse"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="h-4 bg-slate-700/50 rounded-lg w-3/4 mb-2" />
              <div className="h-3 bg-slate-700/30 rounded-lg w-1/2" />
            </div>
            <div className="h-5 w-16 bg-slate-700/40 rounded-full" />
          </div>
          <div className="flex gap-4 mb-4">
            <div className="h-3 bg-slate-700/30 rounded w-20" />
            <div className="h-3 bg-slate-700/30 rounded w-16" />
            <div className="h-3 bg-slate-700/30 rounded w-14" />
          </div>
          <div className="border-t border-slate-700/50 pt-3 flex gap-2">
            <div className="h-7 bg-slate-700/30 rounded-md w-16" />
            <div className="h-7 bg-slate-700/30 rounded-md w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchMonitors = useCallback(async () => {
    try {
      const res = await fetch('/api/monitors');
      if (!res.ok) throw new Error('Failed to fetch monitors');
      const data = await res.json();
      setMonitors(data.monitors || []);
    } catch {
      addToast({ type: 'error', message: 'Failed to load monitors. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const handlePause = async (id: string) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
      if (!res.ok) throw new Error('Failed to pause monitor');
      setMonitors((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'paused' as const } : m))
      );
      addToast({ type: 'success', message: 'Monitor paused successfully.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to pause monitor.' });
    }
  };

  const handleResume = async (id: string) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) throw new Error('Failed to resume monitor');
      setMonitors((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'active' as const } : m))
      );
      addToast({ type: 'success', message: 'Monitor resumed successfully.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to resume monitor.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this monitor?')) return;
    try {
      const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete monitor');
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      addToast({ type: 'success', message: 'Monitor deleted successfully.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete monitor.' });
    }
  };

  const handleCheckNow = async (id: string) => {
    try {
      const res = await fetch(`/api/monitors/${id}/check`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to trigger check');
      addToast({ type: 'success', message: 'Check triggered! Results will appear shortly.' });
      // Refresh monitors after a brief delay to pick up new data
      setTimeout(() => fetchMonitors(), 2000);
    } catch {
      addToast({ type: 'error', message: 'Failed to trigger check.' });
    }
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Your <span className="gradient-text">Monitors</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {monitors.length > 0
              ? `Tracking ${monitors.length} website${monitors.length !== 1 ? 's' : ''}`
              : 'Start monitoring websites for changes'}
          </p>
        </div>
        <Link href="/dashboard/monitors/new">
          <Button size="md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Monitor
          </Button>
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : monitors.length === 0 ? (
        <EmptyState
          onCtaClick={() => {
            window.location.href = '/dashboard/monitors/new';
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monitors.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              monitor={monitor}
              onPause={handlePause}
              onResume={handleResume}
              onDelete={handleDelete}
              onCheckNow={handleCheckNow}
            />
          ))}
        </div>
      )}
    </div>
  );
}
