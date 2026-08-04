'use client';

import React, { useState, useCallback } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useUser } from '@/lib/user-context';
import { getAvailableIntervals } from '@/lib/plans';

export type MonitorType =
  | 'full_page'
  | 'css_selector'
  | 'keyword_appears'
  | 'keyword_disappears'
  | 'price_drop';

export interface MonitorFormValues {
  url: string;
  name: string;
  type: MonitorType;
  selector: string;
  keyword: string;
  price_threshold: string;
  interval_seconds: number;
  notify_webhook: boolean;
}

interface MonitorFormProps {
  mode?: 'create' | 'edit';
  initial?: Partial<MonitorFormValues>;
  hasWebhookChannel?: boolean;
  onSubmit: (data: MonitorFormValues) => void;
  isLoading?: boolean;
}

const MONITOR_TYPES: {
  value: MonitorType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'full_page',
    label: 'Full Page',
    description: 'Track any change anywhere on the page.',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    value: 'css_selector',
    label: 'CSS Selector',
    description: 'Watch one specific element you pick.',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4h16v4H4V4zm0 6h10v10H4V10zm12 2h4v8h-4v-8z" />
      </svg>
    ),
  },
  {
    value: 'keyword_appears',
    label: 'Keyword Appears',
    description: 'Alert the moment a word or phrase shows up.',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    value: 'keyword_disappears',
    label: 'Keyword Disappears',
    description: 'Alert when a phrase is removed — e.g. "Sold Out".',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 12H6" />
      </svg>
    ),
  },
  {
    value: 'price_drop',
    label: 'Price Drop',
    description: 'Track a price and get notified when it moves.',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function MonitorForm({
  mode = 'create',
  initial,
  hasWebhookChannel = false,
  onSubmit,
  isLoading = false,
}: MonitorFormProps) {
  const user = useUser();
  const availableIntervals = getAvailableIntervals(user.plan);

  const [url, setUrl] = useState(initial?.url ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<MonitorType>(initial?.type ?? 'full_page');
  const [selector, setSelector] = useState(initial?.selector ?? '');
  const [keyword, setKeyword] = useState(initial?.keyword ?? '');
  const [priceThreshold, setPriceThreshold] = useState(initial?.price_threshold ?? '');
  const [intervalSeconds, setIntervalSeconds] = useState(
    initial?.interval_seconds ?? availableIntervals[availableIntervals.length - 1].seconds
  );
  const [notifyWebhook, setNotifyWebhook] = useState(initial?.notify_webhook ?? false);

  const [urlError, setUrlError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [touched, setTouched] = useState(false);

  const validateUrl = useCallback((value: string) => {
    if (!value.trim()) {
      setUrlError('URL is required');
      return false;
    }
    if (!isValidUrl(value)) {
      setUrlError('Please enter a valid URL (e.g. https://example.com)');
      return false;
    }
    setUrlError('');
    return true;
  }, []);

  const handleUrlBlur = () => {
    setTouched(true);
    if (url) validateUrl(url);
  };

  const needsSelector = type === 'css_selector' || type === 'price_drop';
  const needsKeyword = type === 'keyword_appears' || type === 'keyword_disappears';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setFieldError('');

    if (!validateUrl(url)) return;

    if (needsSelector && !selector.trim()) {
      setFieldError('A CSS selector is required for this monitor type.');
      return;
    }
    if (needsKeyword && !keyword.trim()) {
      setFieldError('A keyword is required for this monitor type.');
      return;
    }
    if (priceThreshold && isNaN(parseFloat(priceThreshold))) {
      setFieldError('Price target must be a number.');
      return;
    }

    onSubmit({
      url: url.trim(),
      name: name.trim(),
      type,
      selector: selector.trim(),
      keyword: keyword.trim(),
      price_threshold: priceThreshold.trim(),
      interval_seconds: intervalSeconds,
      notify_webhook: notifyWebhook,
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">
          {mode === 'edit' ? 'Edit Monitor' : 'Add New Monitor'}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Enter a URL and choose what to watch for.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="URL"
          type="url"
          placeholder="https://example.com/page"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (touched) validateUrl(e.target.value);
          }}
          onBlur={handleUrlBlur}
          error={touched ? urlError : undefined}
          required
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          }
        />

        <Input
          label="Friendly Name"
          type="text"
          placeholder="My Landing Page (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          helperText="Give your monitor a memorable name"
        />

        {/* Monitor type picker */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            What should we watch for?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MONITOR_TYPES.map((t) => {
              const selected = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setType(t.value)}
                  className={`flex items-start gap-3 text-left p-3 rounded-xl border transition-all duration-200 ${
                    selected
                      ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <span
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 ${
                      selected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {t.icon}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${selected ? 'text-white' : 'text-slate-300'}`}>
                      {t.label}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5 leading-snug">
                      {t.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Type-specific fields */}
        {needsSelector && (
          <Input
            label="CSS Selector"
            type="text"
            placeholder=".price, #stock-status, h1.title"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            helperText='Right-click the element in your browser → "Inspect" to find its selector.'
            required
          />
        )}

        {type === 'price_drop' && (
          <Input
            label="Alert when price drops to or below (optional)"
            type="number"
            step="0.01"
            placeholder="e.g. 49.99"
            value={priceThreshold}
            onChange={(e) => setPriceThreshold(e.target.value)}
            helperText="Leave blank to get notified on every price change, up or down."
          />
        )}

        {needsKeyword && (
          <Input
            label="Keyword or Phrase"
            type="text"
            placeholder={type === 'keyword_appears' ? 'e.g. In Stock' : 'e.g. Sold Out'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
          />
        )}

        {/* Check interval */}
        <div>
          <label htmlFor="interval" className="block text-sm font-medium text-slate-300 mb-2">
            Check frequency
          </label>
          <select
            id="interval"
            value={intervalSeconds}
            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 text-sm text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 hover:border-slate-600 transition-all"
          >
            {availableIntervals.map((c) => (
              <option key={c.seconds} value={c.seconds}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Your {user.plan} plan allows checks as often as{' '}
            {availableIntervals[0].label.toLowerCase()}.
          </p>
        </div>

        {/* Webhook notification opt-in */}
        {hasWebhookChannel ? (
          <label className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-700/30 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyWebhook}
              onChange={(e) => setNotifyWebhook(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/40"
            />
            <span className="text-sm text-slate-300">Also notify via webhook</span>
          </label>
        ) : (
          <p className="text-xs text-slate-500 px-1">
            Want webhook alerts for this monitor? Add a webhook in{' '}
            <a href="/dashboard/settings" className="text-indigo-400 hover:text-indigo-300">
              Settings
            </a>
            .
          </p>
        )}

        {fieldError && (
          <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <p className="text-xs text-rose-400">{fieldError}</p>
          </div>
        )}

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {mode === 'edit' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Start Monitoring
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
