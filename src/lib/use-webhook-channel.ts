'use client';

import { useEffect, useState } from 'react';

/** Whether the current user has at least one webhook notification channel configured. */
export function useHasWebhookChannel(): boolean {
  const [hasChannel, setHasChannel] = useState(false);

  useEffect(() => {
    fetch('/api/channels')
      .then((r) => (r.ok ? r.json() : { channels: [] }))
      .then((data) => {
        const channels: { type: string }[] = data.channels || [];
        setHasChannel(channels.some((c) => c.type === 'webhook'));
      })
      .catch(() => setHasChannel(false));
  }, []);

  return hasChannel;
}
