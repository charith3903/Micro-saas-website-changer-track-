import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  error: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  default: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

const dotColors: Record<string, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-rose-400',
  info: 'bg-blue-400',
  default: 'bg-slate-400',
};

export default function Badge({
  variant = 'default',
  children,
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-0.5 rounded-full text-xs font-medium
        border transition-colors duration-200
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />
      )}
      {children}
    </span>
  );
}
