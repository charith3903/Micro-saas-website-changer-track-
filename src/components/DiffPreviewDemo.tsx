'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  {
    status: 'Out of Stock',
    tone: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    alert: false,
  },
  {
    status: 'In Stock',
    tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    alert: true,
  },
];

/**
 * Self-contained animated mock of a change-detection cycle — no network
 * calls, no real data. Illustrative only; captioned as such by the caller.
 */
export default function DiffPreviewDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2800);
    return () => clearInterval(id);
  }, []);

  const current = STEPS[step];

  return (
    <div className="glass-card overflow-hidden max-w-md mx-auto">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50 bg-slate-900/40">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        <span className="ml-3 text-xs text-slate-500 font-mono truncate">
          sneaker-store.example/air-runner-2025
        </span>
      </div>

      {/* Mock product page */}
      <div className="p-5 relative">
        <div className="h-24 rounded-lg bg-gradient-to-br from-slate-700/40 to-slate-800/40 mb-4" />
        <div className="h-3 w-3/4 bg-slate-700/50 rounded mb-2" />
        <div className="h-3 w-1/2 bg-slate-700/30 rounded mb-4" />

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white">$180.00</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-500 ${current.tone}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {current.status}
          </span>
        </div>

        {/* Change-detected toast */}
        <div
          className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 border border-emerald-500/30 text-emerald-400 text-xs font-medium shadow-lg transition-all duration-500 ${
            current.alert ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Change detected
        </div>
      </div>
    </div>
  );
}
