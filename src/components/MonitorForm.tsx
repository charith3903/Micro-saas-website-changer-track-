'use client';

import React, { useState, useCallback } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface MonitorFormProps {
  onSubmit: (data: { url: string; name: string }) => void;
  isLoading?: boolean;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function MonitorForm({
  onSubmit,
  isLoading = false,
}: MonitorFormProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [urlError, setUrlError] = useState('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validateUrl(url)) return;
    onSubmit({ url: url.trim(), name: name.trim() });
  };

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">Add New Monitor</h3>
        <p className="text-sm text-slate-500 mt-1">
          Enter a URL to start tracking changes on any webpage.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Fixed settings for Phase 1 */}
        <div className="flex items-center gap-6 py-3 px-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
            <span className="text-xs text-slate-400">
              Type: <span className="text-slate-300 font-medium">Full Page</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-xs text-slate-400">
              Mode: <span className="text-slate-300 font-medium">Fast HTML</span>
            </span>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Start Monitoring
        </Button>
      </form>
    </Card>
  );
}
