'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';

interface NavbarProps {
  userEmail: string;
  plan?: string;
  onLogout: () => void;
}

const planStyles: Record<string, string> = {
  free: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  basic: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  pro: 'bg-gradient-to-r from-indigo-500/15 to-violet-500/15 text-indigo-300 border-indigo-500/30',
};

const NAV_LINKS = [
  { href: '/dashboard', label: 'Monitors' },
  { href: '/dashboard/subscriptions', label: 'Subscriptions' },
  { href: '/dashboard/alerts', label: 'Alerts' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default function Navbar({ userEmail, plan, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {/* Pulse dot */}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Web<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Monitor</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = link.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'text-white bg-slate-800/80' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User section */}
          <div className="flex items-center gap-3">
            {plan && (
              <span
                className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${planStyles[plan] || planStyles.free}`}
              >
                {plan} plan
              </span>
            )}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center">
                <span className="text-xs font-semibold text-indigo-300 uppercase">
                  {userEmail.charAt(0)}
                </span>
              </div>
              <span className="text-sm text-slate-400 max-w-[180px] truncate">
                {userEmail}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav links */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = link.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'text-white bg-slate-800/80' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
