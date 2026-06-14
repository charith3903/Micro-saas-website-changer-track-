'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MonitorForm from '@/components/MonitorForm';
import { useToast } from '@/components/ui/Toast';

export default function AddMonitorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  const handleSubmit = async (data: { url: string; name: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create monitor');
      }

      addToast({
        type: 'success',
        title: 'Monitor Created',
        message: 'Your new monitor has been added and will start checking soon.',
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      addToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-400 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Add New <span className="gradient-text">Monitor</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter a URL to start tracking changes on any webpage.
        </p>
      </div>

      {/* Form Container */}
      <div className="max-w-xl">
        <div className="glass-card p-1">
          <MonitorForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {/* Info Card */}
        <div className="mt-6 glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How it works
          </h3>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
              We&apos;ll take a snapshot of the page content when the monitor is created.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
              On each check, we compare the current content with the previous snapshot.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
              If a change is detected, you&apos;ll receive a notification immediately.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
