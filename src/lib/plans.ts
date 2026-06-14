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
