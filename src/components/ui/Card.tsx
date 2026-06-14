import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export default function Card({
  children,
  className = '',
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-slate-700/50
        bg-slate-800/50 backdrop-blur-xl
        shadow-xl shadow-black/10
        transition-all duration-300 ease-out
        ${
          hoverable
            ? 'hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/5 hover:border-slate-600/50 cursor-pointer'
            : ''
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}
