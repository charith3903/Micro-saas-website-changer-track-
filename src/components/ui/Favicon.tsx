'use client';

import React, { useState } from 'react';

interface FaviconProps {
  url: string;
  size?: number;
  className?: string;
}

function GlobeFallback({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18"
      />
    </svg>
  );
}

export default function Favicon({ url, size = 32, className = '' }: FaviconProps) {
  const [failed, setFailed] = useState(false);

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    // fall through to fallback icon below
  }

  if (failed || !hostname) {
    return (
      <div className={`flex items-center justify-center bg-slate-700/40 text-slate-500 rounded-lg ${className}`}>
        <GlobeFallback className="w-1/2 h-1/2" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center bg-slate-700/40 rounded-lg overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- external favicon service, not a static asset */}
      <img
        src={`https://www.google.com/s2/favicons?sz=${size * 2}&domain_url=${encodeURIComponent(hostname)}`}
        alt=""
        width={size}
        height={size}
        className="w-1/2 h-1/2 object-contain"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}
