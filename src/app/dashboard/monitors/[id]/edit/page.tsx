'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MonitorForm, { type MonitorFormValues } from '@/components/MonitorForm';
import Card from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useHasWebhookChannel } from '@/lib/use-webhook-channel';
import type { Monitor } from '@/lib/types';

function LoadingSkeleton() {
  return (
    <div className="glass-card p-6 animate-pulse max-w-xl">
      <div className="h-5 bg-slate-700/50 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-10 bg-slate-700/30 rounded-lg" />
        <div className="h-10 bg-slate-700/30 rounded-lg" />
        <div className="h-24 bg-slate-700/20 rounded-lg" />
      </div>
    </div>
  );
}

export default function EditMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = params.id as string;
  const hasWebhookChannel = useHasWebhookChannel();

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchMonitor = useCallback(async () => {
    try {
      const res = await fetch(`/api/monitors/${id}`);
      if (!res.ok) throw new Error('Failed to fetch monitor');
      const data = await res.json();
      setMonitor(data.monitor);
    } catch {
      addToast({ type: 'error', message: 'Failed to load monitor.' });
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (id) fetchMonitor();
  }, [id, fetchMonitor]);

  const handleSubmit = async (data: MonitorFormValues) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          price_threshold: data.price_threshold ? parseFloat(data.price_threshold) : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update monitor');
      }

      addToast({ type: 'success', message: 'Monitor updated successfully.' });
      router.push(`/dashboard/monitors/${id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      addToast({ type: 'error', message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-enter">
      <div className="mb-8">
        <Link
          href={`/dashboard/monitors/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-400 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Monitor
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Edit <span className="gradient-text">Monitor</span>
        </h1>
      </div>

      <div className="max-w-xl">
        {loading ? (
          <LoadingSkeleton />
        ) : !monitor ? (
          <Card className="p-6 text-center">
            <p className="text-slate-400">Monitor not found.</p>
          </Card>
        ) : (
          <div className="glass-card p-1">
            <MonitorForm
              mode="edit"
              onSubmit={handleSubmit}
              isLoading={isSaving}
              hasWebhookChannel={hasWebhookChannel}
              initial={{
                url: monitor.url,
                name: monitor.name ?? '',
                type: monitor.type,
                selector: monitor.selector ?? '',
                keyword: monitor.keyword ?? '',
                price_threshold: monitor.price_threshold != null ? String(monitor.price_threshold) : '',
                interval_seconds: monitor.interval_seconds,
                notify_webhook: monitor.notify_webhook,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
