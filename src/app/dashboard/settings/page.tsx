'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/lib/user-context';
import { PLANS, SUBSCRIPTION_TRACKER_PLANS } from '@/lib/plans';

interface Channel {
  id: string;
  type: string;
  destination: string;
  verified: boolean;
  created_at: string;
}

const TIMEZONES: string[] =
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata'];

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-indigo-400 [&>svg]:w-4.5 [&>svg]:h-4.5">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {description && <p className="text-xs text-slate-500 mb-4">{description}</p>}
      <div className={description ? '' : 'mt-4'}>{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const user = useUser();
  const { addToast } = useToast();

  // ── Profile ──
  const [timezone, setTimezone] = useState('UTC');
  const [savingTimezone, setSavingTimezone] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.timezone) setTimezone(data.user.timezone);
      })
      .catch(() => {});
  }, []);

  const handleSaveTimezone = async () => {
    setSavingTimezone(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      addToast({ type: 'success', message: 'Timezone updated.' });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update timezone.' });
    } finally {
      setSavingTimezone(false);
    }
  };

  // ── Password ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to change password');
      addToast({ type: 'success', message: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to change password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Plan ──
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  const handleChangePlan = async (plan: string) => {
    setChangingPlan(plan);
    try {
      const res = await fetch('/api/account/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to change plan');
      addToast({ type: 'success', message: `Switched to the ${PLANS[plan].name} plan.` });
      window.location.reload();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to change plan.' });
      setChangingPlan(null);
    }
  };

  // ── Subscription tracker plan ──
  const [changingSubPlan, setChangingSubPlan] = useState<string | null>(null);

  const handleChangeSubscriptionPlan = async (plan: string) => {
    setChangingSubPlan(plan);
    try {
      const res = await fetch('/api/account/subscription-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to change plan');
      addToast({ type: 'success', message: `Switched to the ${SUBSCRIPTION_TRACKER_PLANS[plan].name} subscription-reminder plan.` });
      window.location.reload();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to change plan.' });
      setChangingSubPlan(null);
    }
  };

  // ── Webhook channels ──
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      setChannels(data.channels || []);
    } catch {
      // non-fatal — section just shows empty
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const canUseWebhooks = PLANS[user.plan]?.channels.includes('webhook');

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingChannel(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'webhook', destination: newWebhookUrl.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add webhook');
      setNewWebhookUrl('');
      addToast({ type: 'success', message: 'Webhook added.' });
      fetchChannels();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add webhook.' });
    } finally {
      setAddingChannel(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!window.confirm('Remove this webhook?')) return;
    try {
      const res = await fetch(`/api/channels/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove webhook');
      setChannels((prev) => prev.filter((c) => c.id !== id));
      addToast({ type: 'success', message: 'Webhook removed.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove webhook.' });
    }
  };

  const handleTestChannel = async (id: string) => {
    setTestingChannelId(id);
    try {
      const res = await fetch(`/api/channels/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.delivered) {
        addToast({ type: 'success', message: `Test payload delivered (HTTP ${data.status}).` });
      } else {
        addToast({ type: 'error', message: data.error || `Delivery failed (HTTP ${data.status ?? '—'}).` });
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to send test payload.' });
    } finally {
      setTestingChannelId(null);
    }
  };

  // ── Delete account ──
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      addToast({ type: 'error', message: 'Type your email exactly to confirm.' });
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account');
      window.location.href = '/';
    } catch {
      addToast({ type: 'error', message: 'Failed to delete account.' });
      setDeleting(false);
    }
  };

  return (
    <div className="page-enter max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Account <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage your profile, plan, and notifications.</p>
      </div>

      {/* Profile */}
      <SectionCard
        title="Profile"
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      >
        <div className="space-y-4">
          <Input label="Email" type="email" value={user.email} disabled />
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-slate-300 mb-1.5">
              Timezone
            </label>
            <div className="flex gap-2">
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 text-sm text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={handleSaveTimezone} isLoading={savingTimezone}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard
        title="Security"
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        }
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" variant="secondary" isLoading={changingPassword}>
            Change Password
          </Button>
        </form>
      </SectionCard>

      {/* Plan */}
      <SectionCard
        title="Plan & Usage"
        description="Instant switch — no payment collected. Billing integration is coming soon."
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(PLANS).map(([key, plan]) => {
            const isCurrent = user.plan === key;
            return (
              <div
                key={key}
                className={`p-4 rounded-xl border ${
                  isCurrent ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-slate-900/40 border-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{plan.name}</span>
                  {isCurrent && <Badge variant="info">Current</Badge>}
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {plan.maxMonitors} monitors · ${plan.price}/mo
                </p>
                {!isCurrent && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleChangePlan(key)}
                    isLoading={changingPlan === key}
                    disabled={changingPlan !== null}
                  >
                    Switch
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Subscription & Trial Reminder plan */}
      <SectionCard
        title="Subscription Reminders Plan"
        description="A separate product from website monitoring — instant switch, no payment collected yet."
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(SUBSCRIPTION_TRACKER_PLANS).map(([key, plan]) => {
            const isCurrent = user.subscription_tracker_plan === key;
            return (
              <div
                key={key}
                className={`p-4 rounded-xl border ${
                  isCurrent ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-slate-900/40 border-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{plan.name}</span>
                  {isCurrent && <Badge variant="info">Current</Badge>}
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {plan.maxTrackedSubscriptions === null ? 'Unlimited' : `${plan.maxTrackedSubscriptions} tracked`} · ${plan.price.toFixed(2)}/mo
                </p>
                {!isCurrent && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleChangeSubscriptionPlan(key)}
                    isLoading={changingSubPlan === key}
                    disabled={changingSubPlan !== null}
                  >
                    Switch
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Notification channels */}
      <SectionCard
        title="Webhook Alerts"
        description={
          canUseWebhooks
            ? 'Send a POST request to a URL whenever a monitor detects a change.'
            : 'Webhook alerts require the Pro plan.'
        }
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        }
      >
        {loadingChannels ? (
          <div className="h-16 rounded-lg bg-slate-800/40 animate-pulse" />
        ) : (
          <div className="space-y-3">
            {channels.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/30"
              >
                <span className="text-sm text-slate-300 truncate flex-1 font-mono">{c.destination}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTestChannel(c.id)}
                  isLoading={testingChannelId === c.id}
                >
                  Send test
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteChannel(c.id)}>
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            ))}

            {canUseWebhooks && channels.length < 3 && (
              <form onSubmit={handleAddChannel} className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://your-endpoint.example.com/webhook"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 text-sm text-white placeholder-slate-500 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                />
                <Button type="submit" variant="secondary" isLoading={addingChannel}>
                  Add
                </Button>
              </form>
            )}
          </div>
        )}
      </SectionCard>

      {/* Danger zone */}
      <Card className="p-6 border-rose-500/20">
        <div className="flex items-center gap-2.5 mb-1">
          <svg className="w-4.5 h-4.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-sm font-semibold text-rose-400">Danger Zone</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Permanently deletes your account, all monitors, and check history. This cannot be undone.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder={`Type "${user.email}" to confirm`}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            className="flex-1 rounded-lg border border-rose-500/30 bg-slate-800/80 text-sm text-white placeholder-slate-500 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500"
          />
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            isLoading={deleting}
            disabled={confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()}
          >
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
