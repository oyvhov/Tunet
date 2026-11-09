import { MOBILE_BREAKPOINT } from '../config/constants';

export const CONNECTION_PING_INTERVAL_MS = 60_000;
/** Longer than the wake-up probe: a busy Home Assistant must not lose a working socket. */
export const CONNECTION_PING_TIMEOUT_MS = 10_000;
export const ENTITY_STALE_DISCONNECT_GRACE_MS = 15_000;
// Longer than the ping interval plus its timeout, so a quiet house never counts as stale.
export const ENTITY_STALE_NO_UPDATE_MS = 90_000;
export const CONNECTION_WARNING_DELAY_MS = 5_000;
export const MOBILE_CONNECTION_WARNING_DELAY_MS = 15_000;

export const getConnectionWarningDelayMs = (viewportWidth: number): number =>
  viewportWidth < MOBILE_BREAKPOINT
    ? MOBILE_CONNECTION_WARNING_DELAY_MS
    : CONNECTION_WARNING_DELAY_MS;

export interface EntityDataStaleInput {
  entitiesLoaded: boolean;
  connected: boolean;
  disconnectedSince: number | null;
  lastEntityUpdateAt: number;
  now?: number;
}

export const isEntityDataStale = ({
  entitiesLoaded,
  connected,
  disconnectedSince,
  lastEntityUpdateAt,
  now = Date.now(),
}: EntityDataStaleInput): boolean => {
  if (!entitiesLoaded) return false;

  if (!connected) {
    if (!disconnectedSince) return false;
    return now - disconnectedSince >= ENTITY_STALE_DISCONNECT_GRACE_MS;
  }

  if (!lastEntityUpdateAt) return false;
  return now - lastEntityUpdateAt >= ENTITY_STALE_NO_UPDATE_MS;
};
