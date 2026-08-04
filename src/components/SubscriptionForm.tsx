'use client';

import React, { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { BillingCycle } from '@/lib/types';

export interface SubscriptionFormValues {
  name: string;
  is_trial: boolean;
  amount: string;
  currency: string;
  billing_cycle: BillingCycle;
  next_renewal_date: string;
  reminder_days_before: number;
  notes: string;
}

interface SubscriptionFormProps {
  mode?: 'create' | 'edit';
  initial?: Partial<SubscriptionFormValues>;
  onSubmit: (data: SubscriptionFormValues) => void;
  isLoading?: boolean;
}

const CURRENCIES = ['EUR', 'USD', 'GBP'];
const REMINDER_CHOICES = [1, 2, 3, 5, 7, 14];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SubscriptionForm({
  mode = 'create',
  initial,
  onSubmit,
  isLoading = false,
}: SubscriptionFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [isTrial, setIsTrial] = useState(initial?.is_trial ?? false);
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'EUR');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initial?.billing_cycle ?? 'monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState(initial?.next_renewal_date ?? todayIso());
  const [reminderDaysBefore, setReminderDaysBefore] = useState(initial?.reminder_days_before ?? 3);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Give this subscription a name.');
      return;
    }
    if (!nextRenewalDate) {
      setError(isTrial ? 'Trial end date is required.' : 'Renewal date is required.');
      return;
    }
    if (amount && isNaN(parseFloat(amount))) {
      setError('Amount must be a number.');
      return;
    }

    onSubmit({
      name: name.trim(),
      is_trial: isTrial,
      amount,
      currency,
      billing_cycle: isTrial ? 'one_time' : billingCycle,
      next_renewal_date: nextRenewalDate,
      reminder_days_before: reminderDaysBefore,
      notes: notes.trim(),
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">
          {mode === 'edit' ? 'Edit Subscription' : 'Track a Subscription or Trial'}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          We&apos;ll remind you by email before it renews or the trial ends.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Name"
          type="text"
          placeholder="Netflix, Adobe Creative Cloud, gym membership…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-700/30 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={isTrial}
            onChange={(e) => setIsTrial(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/40"
          />
          <span className="text-sm text-slate-300">This is a free trial that will start charging</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Amount (optional)"
            type="number"
            step="0.01"
            placeholder="9.99"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-slate-300 mb-1.5">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/80 text-sm text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isTrial && (
          <div>
            <label htmlFor="cycle" className="block text-sm font-medium text-slate-300 mb-1.5">
              Billing cycle
            </label>
            <select
              id="cycle"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/80 text-sm text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}

        <Input
          label={isTrial ? 'Trial ends on' : 'Next renewal date'}
          type="date"
          value={nextRenewalDate}
          onChange={(e) => setNextRenewalDate(e.target.value)}
          required
        />

        <div>
          <label htmlFor="reminder" className="block text-sm font-medium text-slate-300 mb-1.5">
            Remind me
          </label>
          <select
            id="reminder"
            value={reminderDaysBefore}
            onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 text-sm text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
          >
            {REMINDER_CHOICES.map((d) => (
              <option key={d} value={d}>
                {d} day{d !== 1 ? 's' : ''} before
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Notes (optional)"
          type="text"
          placeholder="Shared with roommate, cancel via app not website…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && (
          <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        )}

        <Button type="submit" isLoading={isLoading} disabled={isLoading} className="w-full" size="lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mode === 'edit' ? 'M5 13l4 4L19 7' : 'M12 4v16m8-8H4'} />
          </svg>
          {mode === 'edit' ? 'Save Changes' : 'Start Tracking'}
        </Button>
      </form>
    </Card>
  );
}
