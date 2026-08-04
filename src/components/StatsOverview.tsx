import React from 'react';
import StatTile from '@/components/ui/StatTile';

interface MonitorLike {
  status: 'active' | 'paused' | 'error';
}

interface StatsOverviewProps {
  monitors: MonitorLike[];
}

export default function StatsOverview({ monitors }: StatsOverviewProps) {
  const total = monitors.length;
  const active = monitors.filter((m) => m.status === 'active').length;
  const paused = monitors.filter((m) => m.status === 'paused').length;
  const errors = monitors.filter((m) => m.status === 'error').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatTile
        label="Total Monitors"
        value={total}
        tone="brand"
        icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      />
      <StatTile
        label="Active"
        value={active}
        tone="success"
        icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />
      <StatTile
        label="Paused"
        value={paused}
        tone="warning"
        icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <StatTile
        label="Errors"
        value={errors}
        tone="error"
        icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        }
      />
    </div>
  );
}
