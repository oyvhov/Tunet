const CHUNK_RELOAD_KEY = 'tunet_chunk_reload_at';
const CHUNK_RELOAD_RETRY_MS = 5 * 60 * 1000;

type ReloadStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Milliseconds until a refused reload may be tried again. */
export function getChunkReloadWait(storage: ReloadStorage, now: number = Date.now()): number {
  const last = storage.getItem(CHUNK_RELOAD_KEY);
  return last === null ? 0 : Math.max(0, CHUNK_RELOAD_RETRY_MS - (now - Number(last)));
}

/**
 * Decides whether a failed chunk load may reload the page. A second failure right
 * after a reload is refused so it cannot loop, but a tab that stays open for weeks
 * must still be able to reload for each later release.
 */
export function claimChunkReload(storage: ReloadStorage, now: number = Date.now()): boolean {
  const last = storage.getItem(CHUNK_RELOAD_KEY);
  if (last !== null && now - Number(last) < CHUNK_RELOAD_RETRY_MS) return false;
  storage.setItem(CHUNK_RELOAD_KEY, String(now));
  return true;
}
