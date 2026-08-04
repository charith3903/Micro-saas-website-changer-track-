'use client';

import { createContext, useContext } from 'react';

export interface DashboardUser {
  id: string;
  email: string;
  plan: string;
  subscription_tracker_plan: string;
}

export const UserContext = createContext<DashboardUser | null>(null);

export function useUser(): DashboardUser {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within DashboardLayout');
  }
  return ctx;
}
