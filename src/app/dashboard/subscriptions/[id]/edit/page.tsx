'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SubscriptionForm, { type SubscriptionFormValues } from '@/components/SubscriptionForm';
import Card from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import type { TrackedSubscription } from '@/lib/types';

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

export default function EditSubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = params.id as string;

  const [subscription, setSubscription] = useState<TrackedSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch subscription');
      const data = await res.json();
      setSubscription(data.subscription);
    } catch {
      addToast({ type: 'error', message: 'Failed to load subscription.' });
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (id) fetchSubscription();
  }, [id, fetchSubscription]);

  const handleSubmit = async (data: SubscriptionFormValues) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount: data.amount ? parseFloat(data.amount) : null,
          notes: data.notes || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update subscription');
      }

      addToast({ type: 'success', message: 'Subscription updated.' });
      router.push('/dashboard/subscriptions');
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
          href="/dashboard/subscriptions"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-400 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Subscriptions
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Edit <span className="gradient-text">Subscription</span>
        </h1>
      </div>

      <div className="max-w-xl">
        {loading ? (
          <LoadingSkeleton />
        ) : !subscription ? (
          <Card className="p-6 text-center">
            <p className="text-slate-400">Subscription not found.</p>
          </Card>
        ) : (
          <div className="glass-card p-1">
            <SubscriptionForm
              mode="edit"
              onSubmit={handleSubmit}
              isLoading={isSaving}
              initial={{
                name: subscription.name,
                is_trial: subscription.is_trial,
                amount: subscription.amount != null ? String(subscription.amount) : '',
                currency: subscription.currency,
                billing_cycle: subscription.billing_cycle,
                next_renewal_date: subscription.next_renewal_date.slice(0, 10),
                reminder_days_before: subscription.reminder_days_before,
                notes: subscription.notes ?? '',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
