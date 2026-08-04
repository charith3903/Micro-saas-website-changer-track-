'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import MonitorCard from '@/components/MonitorCard';
import EmptyState from '@/components/EmptyState';
import StatsOverview from '@/components/StatsOverview';
import PlanUsage from '@/components/PlanUsage';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/lib/user-context';

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

type StatusFilter = 'all' | 'active' | 'paused' | 'error';
type SortOption = 'newest' | 'oldest' | 'name' | 'status';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'error', label: 'Error' },
];

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const { addToast } = useToast();
  const user = useUser();

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

  const visibleMonitors = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = monitors.filter((m) => {
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesSearch =
        !q ||
        (m.name || '').toLowerCase().includes(q) ||
        m.url.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || a.url).localeCompare(b.name || b.url);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [monitors, search, statusFilter, sortBy]);

  const hasMonitors = monitors.length > 0;
  const hasResults = visibleMonitors.length > 0;
  const filtersActive = search.trim() !== '' || statusFilter !== 'all';

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Your <span className="gradient-text">Monitors</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {hasMonitors
              ? `Tracking ${monitors.length} website${monitors.length !== 1 ? 's' : ''}`
              : 'Start monitoring websites for changes'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PlanUsage plan={user.plan} count={monitors.length} />
          <Link href="/dashboard/monitors/new">
            <Button size="md">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Monitor
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats overview */}
      {!loading && hasMonitors && <StatsOverview monitors={monitors} />}

      {/* Toolbar: search, status filter, sort */}
      {!loading && hasMonitors && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <Input
              type="search"
              placeholder="Search by name or URL…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search monitors"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  statusFilter === f.value
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'bg-transparent text-slate-400 border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort monitors"
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-800/80 text-sm text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 hover:border-slate-600 transition-all"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A–Z)</option>
            <option value="status">Status</option>
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : !hasMonitors ? (
        <EmptyState
          onCtaClick={() => {
            window.location.href = '/dashboard/monitors/new';
          }}
        />
      ) : !hasResults ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-1">No monitors match your filters</h3>
          <p className="text-sm text-slate-500 mb-4">Try a different search term or status filter.</p>
          {filtersActive && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleMonitors.map((monitor) => (
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
