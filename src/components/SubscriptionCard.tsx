'use client';

import React from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { TrackedSubscription } from '@/lib/types';

interface SubscriptionCardProps {
  subscription: TrackedSubscription;
  onCancel: (id: string) => void;
  onReactivate: (id: string) => void;
  onDelete: (id: string) => void;
}

const cycleLabels: Record<string, string> = {
  weekly: '/week',
  monthly: '/month',
  quarterly: '/quarter',
  yearly: '/year',
  one_time: 'one-time',
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function countdownLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export default function SubscriptionCard({
  subscription,
  onCancel,
  onReactivate,
  onDelete,
}: SubscriptionCardProps) {
  const days = daysUntil(subscription.next_renewal_date);
  const urgent = subscription.status === 'active' && days <= 3;
  const isCancelled = subscription.status === 'cancelled';
  const isExpired = subscription.status === 'expired';

  return (
    <Card
      className={`p-5 relative overflow-hidden ${isCancelled || isExpired ? 'opacity-60' : ''}`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 ${
          isExpired ? 'bg-slate-600' : isCancelled ? 'bg-slate-500' : urgent ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-white font-semibold truncate text-sm">{subscription.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {subscription.amount != null
              ? `${subscription.currency} ${Number(subscription.amount).toFixed(2)} ${cycleLabels[subscription.billing_cycle]}`
              : cycleLabels[subscription.billing_cycle]}
          </p>
        </div>
        {subscription.is_trial && <Badge variant="info">Trial</Badge>}
      </div>

      <div className="flex items-center gap-2 mb-4">
        {isExpired ? (
          <Badge variant="default">Expired</Badge>
        ) : isCancelled ? (
          <Badge variant="default">Cancelled</Badge>
        ) : (
          <Badge variant={urgent ? 'warning' : 'success'} dot>
            {subscription.is_trial ? 'Ends' : 'Renews'} {countdownLabel(days).toLowerCase()}
          </Badge>
        )}
        <span className="text-xs text-slate-500">
          {new Date(subscription.next_renewal_date).toLocaleDateString()}
        </span>
      </div>

      <div className="border-t border-slate-700/50 pt-3 flex items-center gap-2">
        <Link href={`/dashboard/subscriptions/${subscription.id}/edit`}>
          <Button variant="ghost" size="sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
        </Link>
        {!isExpired && (
          isCancelled ? (
            <Button variant="ghost" size="sm" onClick={() => onReactivate(subscription.id)}>
              Reactivate
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onCancel(subscription.id)}>
              Mark Cancelled
            </Button>
          )
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(subscription.id)}
          className="!px-2 text-slate-500 hover:!text-rose-400 hover:!bg-rose-500/10"
          aria-label="Delete"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </Card>
  );
}
