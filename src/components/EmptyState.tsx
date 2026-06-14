'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export default function EmptyState({
  title = 'No monitors yet',
  description = 'Start tracking website changes by adding your first monitor. You\'ll get notified whenever something changes.',
  ctaLabel = 'Add Your First Monitor',
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Text */}
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          {description}
        </p>

        {/* CTA */}
        {onCtaClick && (
          <Button onClick={onCtaClick} size="lg" className="w-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {ctaLabel}
          </Button>
        )}

        {/* Decorative dots */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <span className="w-1 h-1 rounded-full bg-indigo-500/40" />
          <span className="w-1 h-1 rounded-full bg-violet-500/40" />
          <span className="w-1 h-1 rounded-full bg-indigo-500/40" />
        </div>
      </Card>
    </div>
  );
}
