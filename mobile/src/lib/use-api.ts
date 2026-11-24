import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { api } from './api';
import { onLiveRefresh } from './live-refresh';

/**
 * Loads an /api/app path, again every time the screen comes back into view
 * (so a change made on a detail screen shows on the list). Pull-to-refresh calls refresh().
 * With live: true (list screens), while it's open it also reloads quietly when he comes back to
 * the app, when an alert arrives and every minute while it's on screen (lib/live-refresh.ts).
 */
export function useApi<T>(path: string | null, opts: { live?: boolean } = {}) {
  const live = Boolean(opts.live);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  const load = useCallback(
    async (mode: 'focus' | 'pull') => {
      if (!path) return;
      const run = ++latest.current;
      if (mode === 'pull') setRefreshing(true);
      try {
        const result = await api<T>(path);
        if (run === latest.current) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (run === latest.current) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (run === latest.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path]
  );

  useFocusEffect(
    useCallback(() => {
      void load('focus');
      // Only list screens opt in: a screen with something being edited (a draft, a form) never
      // reloads under his hands.
      return live ? onLiveRefresh(() => void load('focus')) : undefined;
    }, [load, live])
  );

  const refresh = useCallback(() => load('pull'), [load]);
  /** Reloads without the pull-down spinner, e.g. after an action changed the list. */
  const reload = useCallback(() => load('focus'), [load]);
  return { data, setData, error, loading, refreshing, refresh, reload };
}
