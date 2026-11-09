import { useEffect, useState } from 'react';
import type { Connection } from 'home-assistant-js-websocket';

interface UseRefreshTickOptions {
  enabled?: boolean;
  intervalMs?: number;
}

/**
 * A counter for effect dependencies, so fetched data stays current on a dashboard
 * that is never reloaded. It rises on a timer and whenever Home Assistant reconnects;
 * a reconnect keeps the same Connection object, so depending on `conn` alone misses it.
 */
export function useRefreshTick(
  conn: Connection | null | undefined,
  { enabled = true, intervalMs }: UseRefreshTickOptions = {}
): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const bump = () => setTick((value) => value + 1);
    conn?.addEventListener?.('ready', bump);
    const timer = intervalMs ? setInterval(bump, intervalMs) : undefined;
    return () => {
      conn?.removeEventListener?.('ready', bump);
      if (timer) clearInterval(timer);
    };
  }, [conn, enabled, intervalMs]);

  return tick;
}
