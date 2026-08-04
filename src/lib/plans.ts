import type { PlanConfig } from './types';

// ============================================================
// Plan definitions — single source of truth
// ============================================================

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: 'Free',
    price: 0,
    maxMonitors: 2,
    minIntervalSeconds: 86400,      // every 24 hours
    channels: ['email'],
  },
  basic: {
    name: 'Basic',
    price: 3,
    maxMonitors: 10,
    minIntervalSeconds: 3600,       // every 1 hour
    channels: ['email', 'telegram'],
    yearlyPrice: 30,               // ~$2.50/mo
  },
  pro: {
    name: 'Pro',
    price: 5,
    maxMonitors: 30,
    minIntervalSeconds: 900,        // every 15 minutes
    channels: ['email', 'telegram', 'webhook'],
    yearlyPrice: 48,               // ~$4/mo
  },
};

// ============================================================
// Helpers to check plan limits
// ============================================================

export function getPlanConfig(plan: string): PlanConfig {
  return PLANS[plan] || PLANS.free;
}

export function canAddMonitor(
  plan: string,
  currentMonitorCount: number
): boolean {
  const config = getPlanConfig(plan);
  return currentMonitorCount < config.maxMonitors;
}

export function getIntervalForPlan(plan: string): number {
  const config = getPlanConfig(plan);
  return config.minIntervalSeconds;
}

export function canUseChannel(
  plan: string,
  channel: 'email' | 'telegram' | 'webhook'
): boolean {
  const config = getPlanConfig(plan);
  return config.channels.includes(channel);
}

// ============================================================
// Check-interval choices — users may pick anything at or slower
// than their plan's floor (never faster; that's the plan's job).
// ============================================================

const INTERVAL_CHOICES: { label: string; seconds: number }[] = [
  { label: 'Every 15 minutes', seconds: 900 },
  { label: 'Every 30 minutes', seconds: 1800 },
  { label: 'Every hour', seconds: 3600 },
  { label: 'Every 3 hours', seconds: 10800 },
  { label: 'Every 6 hours', seconds: 21600 },
  { label: 'Every 12 hours', seconds: 43200 },
  { label: 'Every 24 hours', seconds: 86400 },
];

export function getAvailableIntervals(plan: string): { label: string; seconds: number }[] {
  const floor = getIntervalForPlan(plan);
  return INTERVAL_CHOICES.filter((c) => c.seconds >= floor);
}

export function isValidInterval(plan: string, seconds: number): boolean {
  return seconds >= getIntervalForPlan(plan);
}

// ============================================================
// Subscription & Trial Reminder plans — billed independently
// from the website-monitor plans above (a user may want one
// product without the other).
// ============================================================

export interface SubscriptionTrackerPlanConfig {
  name: string;
  price: number; // monthly price in USD
  maxTrackedSubscriptions: number | null; // null = unlimited
}

export const SUBSCRIPTION_TRACKER_PLANS: Record<string, SubscriptionTrackerPlanConfig> = {
  free: {
    name: 'Free',
    price: 0,
    maxTrackedSubscriptions: 3,
  },
  pro: {
    name: 'Pro',
    price: 2.99,
    maxTrackedSubscriptions: null,
  },
};

export function getSubscriptionTrackerPlanConfig(plan: string): SubscriptionTrackerPlanConfig {
  return SUBSCRIPTION_TRACKER_PLANS[plan] || SUBSCRIPTION_TRACKER_PLANS.free;
}

export function canAddTrackedSubscription(plan: string, currentCount: number): boolean {
  const config = getSubscriptionTrackerPlanConfig(plan);
  if (config.maxTrackedSubscriptions === null) return true;
  return currentCount < config.maxTrackedSubscriptions;
}
