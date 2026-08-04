'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import StatTile from '@/components/ui/StatTile';
import { useToast } from '@/components/ui/Toast';

interface AlertRow {
  id: string;
  monitor_id: string;
  monitor_name: string | null;
  monitor_url: string;
  channel: 'email' | 'telegram' | 'webhook';
  sent_at: string;
  delivered: boolean;
  payload: { diff: string | null };
}

const channelIcon: Record<string, React.ReactNode> = {
  email: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  webhook: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  telegram: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 bg-slate-800/40 rounded-xl" />
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error('Failed to load alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch {
      addToast({ type: 'error', message: 'Failed to load alert history.' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const delivered = alerts.filter((a) => a.delivered).length;
  const deliveryRate = alerts.length > 0 ? Math.round((delivered / alerts.length) * 100) : null;

  return (
    <div className="page-enter">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Alert <span className="gradient-text">History</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Every notification sent across all your monitors.</p>
      </div>

      {!loading && alerts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <StatTile
            label="Total Alerts"
            value={alerts.length}
            tone="brand"
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
          />
          <StatTile
            label="Delivery Rate"
            value={deliveryRate !== null ? `${deliveryRate}%` : '—'}
            tone={deliveryRate === null ? 'neutral' : deliveryRate >= 95 ? 'success' : 'warning'}
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
          />
        </div>
      )}

      <Card className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-5">
            <LoadingSkeleton />
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">No alerts sent yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              You&apos;ll see a record here every time a monitor detects a change and notifies you.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Time</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Monitor</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Channel</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3 text-sm text-slate-300 whitespace-nowrap">{formatDate(alert.sent_at)}</td>
                    <td className="px-5 py-3 text-sm">
                      <Link
                        href={`/dashboard/monitors/${alert.monitor_id}`}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {alert.monitor_name || alert.monitor_url}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 capitalize">
                        {channelIcon[alert.channel]}
                        {alert.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={alert.delivered ? 'success' : 'error'}>
                        {alert.delivered ? 'Delivered' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 max-w-xs truncate">
                      {alert.payload?.diff || '—'}
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
