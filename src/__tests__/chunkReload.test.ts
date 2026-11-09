import { describe, expect, it } from 'vitest';
import { claimChunkReload } from '../utils/chunkReload';

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};

describe('claimChunkReload', () => {
  it('allows the first reload', () => {
    expect(claimChunkReload(storage(), 1000)).toBe(true);
  });

  it('refuses a second reload straight after, so it cannot loop', () => {
    const store = storage();
    claimChunkReload(store, 1000);
    expect(claimChunkReload(store, 1000 + 60_000)).toBe(false);
  });

  it('allows a reload again for a later release on a tab that stays open', () => {
    const store = storage();
    claimChunkReload(store, 1000);
    expect(claimChunkReload(store, 1000 + 6 * 60_000)).toBe(true);
  });
});
