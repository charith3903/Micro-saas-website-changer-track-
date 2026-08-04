'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import SubscriptionCard from '@/components/SubscriptionCard';
import EmptyState from '@/components/EmptyState';
import StatTile from '@/components/ui/StatTile';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/lib/user-context';
import { getSubscriptionTrackerPlanConfig } from '@/lib/plans';
import type { TrackedSubscription } from '@/lib/types';

type StatusFilter = 'all' | 'active' | 'cancelled' | 'expired';

const CYCLE_TO_MONTHLY: Record<string, number> = {
  weekly: 4.33,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
  one_time: 0,
};

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-5 animate-pulse">
          <div className="h-4 bg-slate-700/50 rounded-lg w-2/3 mb-2" />
          <div className="h-3 bg-slate-700/30 rounded-lg w-1/3 mb-4" />
          <div className="h-5 w-24 bg-slate-700/40 rounded-full mb-4" />
          <div className="border-t border-slate-700/50 pt-3 h-7 bg-slate-700/30 rounded-md w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<TrackedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const { addToast } = useToast();
  const user = useUser();
  const planConfig = getSubscriptionTrackerPlanConfig(user.subscription_tracker_plan);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions');
      if (!res.ok) throw new Error('Failed to fetch subscriptions');
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch {
      addToast({ type: 'error', message: 'Failed to load subscriptions. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error();
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'cancelled' } : s)));
      addToast({ type: 'success', message: 'Marked as cancelled — reminders stopped.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to update subscription.' });
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) throw new Error();
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'active' } : s)));
      addToast({ type: 'success', message: 'Reactivated — reminders resumed.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to update subscription.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Stop tracking this subscription? This removes it permanently.')) return;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      addToast({ type: 'success', message: 'Removed.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove subscription.' });
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subscriptions.filter((s) => {
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesSearch = !q || s.name.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [subscriptions, search, statusFilter]);

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const endingSoon = activeSubs.filter((s) => {
    const days = Math.round((new Date(s.next_renewal_date).getTime() - new Date().getTime()) / 86400000);
    return days <= 7;
  });
  const monthlySpend = activeSubs
    .filter((s) => !s.is_trial && s.amount != null)
    .reduce((sum, s) => sum + Number(s.amount) * (CYCLE_TO_MONTHLY[s.billing_cycle] ?? 0), 0);

  const hasAny = subscriptions.length > 0;
  const hasResults = visible.length > 0;
  const atLimit =
    planConfig.maxTrackedSubscriptions !== null && activeSubs.length >= planConfig.maxTrackedSubscriptions;

  return (
    <div className="page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Subscription <span className="gradient-text">Reminders</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {hasAny
              ? `Tracking ${activeSubs.length} active item${activeSubs.length !== 1 ? 's' : ''}`
              : 'Never pay for a forgotten subscription or trial again'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {planConfig.maxTrackedSubscriptions !== null && (
            <span className="text-xs text-slate-500 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 whitespace-nowrap">
              {activeSubs.length} / {planConfig.maxTrackedSubscriptions} tracked
            </span>
          )}
          <Link href="/dashboard/subscriptions/new">
            <Button size="md" disabled={atLimit} title={atLimit ? 'Upgrade in Settings to track more' : undefined}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Subscription
            </Button>
          </Link>
        </div>
      </div>

      {!loading && hasAny && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatTile
            label="Active"
            value={activeSubs.length}
            tone="brand"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatTile
            label="Ending / Renewing Soon"
            value={endingSoon.length}
            tone={endingSoon.length > 0 ? 'warning' : 'success'}
            hint="Within 7 days"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatTile
            label="Est. Monthly Spend"
            value={`~${monthlySpend.toFixed(2)}`}
            tone="info"
            hint="Excludes trials"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {!loading && hasAny && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <Input
              type="search"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search subscriptions"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {(['active', 'all', 'cancelled', 'expired'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                  statusFilter === f
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'bg-transparent text-slate-400 border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : !hasAny ? (
        <EmptyState
          title="No subscriptions tracked yet"
          description="Add a subscription or free trial and we'll remind you by email before it renews or charges you."
          ctaLabel="Add Your First Subscription"
          onCtaClick={() => {
            window.location.href = '/dashboard/subscriptions/new';
          }}
        />
      ) : !hasResults ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-slate-500">No subscriptions match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              onCancel={handleCancel}
              onReactivate={handleReactivate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
