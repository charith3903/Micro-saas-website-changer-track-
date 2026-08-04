'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SubscriptionForm, { type SubscriptionFormValues } from '@/components/SubscriptionForm';
import { useToast } from '@/components/ui/Toast';

export default function NewSubscriptionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  const handleSubmit = async (data: SubscriptionFormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount: data.amount ? parseFloat(data.amount) : undefined,
          notes: data.notes || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add subscription');
      }

      addToast({
        type: 'success',
        title: 'Subscription tracked',
        message: "We'll remind you before it renews or the trial ends.",
      });
      router.push('/dashboard/subscriptions');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      addToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
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
          Track a <span className="gradient-text">Subscription</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Add a renewal or trial end date and we&apos;ll remind you by email in time to cancel.
        </p>
      </div>

      <div className="max-w-xl">
        <div className="glass-card p-1">
          <SubscriptionForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
