import { act, cleanup, render } from '@testing-library/react';
import { memo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HomeAssistantProvider,
  useHomeAssistantEntities,
  useHomeAssistantMeta,
} from '../contexts/HomeAssistantContext';
import type { HomeAssistantMetaValue } from '../contexts/HomeAssistantContext';
import type { EntityMap } from '../types/dashboard';

const haws = vi.hoisted(() => ({
  emit: (_entities: unknown): void => {},
}));

vi.mock('home-assistant-js-websocket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('home-assistant-js-websocket')>()),
  createLongLivedTokenAuth: vi.fn(() => ({})),
  createConnection: vi.fn(async () => ({
    sendMessagePromise: vi.fn(async () => null),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
  subscribeEntities: vi.fn((_conn: unknown, callback: (entities: unknown) => void) => {
    haws.emit = callback;
    return vi.fn();
  }),
}));

const registry = vi.hoisted(() => ({
  resolve: false,
  release: (): void => {},
}));

vi.mock('../services/haClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/haClient')>()),
  getEntityRegistry: vi.fn(async () => {
    if (registry.resolve) {
      await new Promise<void>((resolve) => {
        registry.release = resolve;
      });
    }
    return [{ entity_id: 'light.a', device_id: 'd1' }];
  }),
  getDeviceRegistry: vi.fn(async () => [{ id: 'd1', name: 'Lamp' }]),
}));

const { enrich } = vi.hoisted(() => ({ enrich: vi.fn() }));

vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>();
  enrich.mockImplementation(actual.enrichEntitiesWithRegistryMetadata);
  return { ...actual, enrichEntitiesWithRegistryMetadata: enrich };
});

vi.mock('../hooks/useMobileConnectionRecovery', () => ({
  useMobileConnectionRecovery: vi.fn(),
}));

const config = { url: 'http://ha.local:8123', token: 'test-token', authMethod: 'token' };
const SNAPSHOT_KEY = 'tunet_entity_snapshot';

const light = (state: string) => ({
  'light.a': { entity_id: 'light.a', state, attributes: { friendly_name: 'A' } },
});

let frames: FrameRequestCallback[] = [];
let metaRenders = 0;
let latestMeta: HomeAssistantMetaValue;
let latestEntities: EntityMap;

const MetaProbe = memo(function MetaProbe() {
  metaRenders += 1;
  latestMeta = useHomeAssistantMeta();
  return null;
});

const EntitiesProbe = memo(function EntitiesProbe() {
  latestEntities = useHomeAssistantEntities();
  return null;
});

const flushFrames = () =>
  act(() => {
    const pending = frames;
    frames = [];
    pending.forEach((frame) => frame(0));
  });

async function connect() {
  render(
    <HomeAssistantProvider config={config}>
      <MetaProbe />
      <EntitiesProbe />
    </HomeAssistantProvider>
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  act(() => haws.emit(light('on')));
  flushFrames();
}

describe('Home Assistant entity updates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    frames = [];
    metaRenders = 0;
    registry.resolve = false;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not re-render meta consumers for an ordinary entity update', async () => {
    await connect();
    const rendersBefore = metaRenders;

    act(() => {
      vi.advanceTimersByTime(1_000);
      haws.emit(light('off'));
    });
    flushFrames();

    expect(latestEntities['light.a'].state).toBe('off');
    expect(metaRenders).toBe(rendersBefore);
  });

  it('flags stale data after a long silence and clears it on the next update', async () => {
    await connect();
    expect(latestMeta.entityDataStale).toBe(false);

    act(() => {
      vi.advanceTimersByTime(95_000);
    });
    expect(latestMeta.entityDataStale).toBe(true);

    act(() => haws.emit(light('off')));
    expect(latestMeta.entityDataStale).toBe(false);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(latestMeta.entityDataStale).toBe(false);
  });

  it('enriches once per frame, using the newest snapshot', async () => {
    await connect();
    enrich.mockClear();
    const newest = light('off');

    act(() => {
      haws.emit(light('on'));
      haws.emit(light('unavailable'));
      haws.emit(newest);
    });
    expect(enrich).not.toHaveBeenCalled();

    flushFrames();
    expect(enrich).toHaveBeenCalledTimes(1);
    expect(enrich.mock.calls[0][0]).toBe(newest);
    expect(latestEntities['light.a'].state).toBe('off');
    expect(latestEntities['light.a'].attributes.device_name).toBe('Lamp');
  });

  it('applies registry metadata that arrives after the first snapshot', async () => {
    registry.resolve = true;
    render(
      <HomeAssistantProvider config={config}>
        <EntitiesProbe />
      </HomeAssistantProvider>
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => haws.emit(light('on')));
    flushFrames();
    expect(latestEntities['light.a'].attributes.device_name).toBeUndefined();

    await act(async () => {
      registry.release();
      await vi.advanceTimersByTimeAsync(0);
    });
    flushFrames();

    expect(latestEntities['light.a'].attributes.device_name).toBe('Lamp');
  });

  describe('session snapshot', () => {
    const savedSnapshot = () => JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY) as string);
    const setVisibility = (state: DocumentVisibilityState) =>
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);

    it('is not written on a timer', async () => {
      await connect();

      act(() => {
        vi.advanceTimersByTime(30_000);
      });

      expect(sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull();
    });

    it('saves the newest enriched data when the page is hidden', async () => {
      await connect();
      act(() => haws.emit(light('off')));

      setVisibility('hidden');
      act(() => document.dispatchEvent(new Event('visibilitychange')));

      const { data } = savedSnapshot();
      expect(data['light.a'].state).toBe('off');
      expect(data['light.a'].attributes.device_name).toBe('Lamp');
    });

    it('saves on pagehide', async () => {
      await connect();

      window.dispatchEvent(new Event('pagehide'));

      expect(savedSnapshot().data['light.a'].state).toBe('on');
    });

    it('does not save when the page becomes visible', async () => {
      await connect();

      setVisibility('visible');
      act(() => document.dispatchEvent(new Event('visibilitychange')));

      expect(sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull();
    });

    it('leaves an existing snapshot alone before any update has arrived', () => {
      sessionStorage.setItem(SNAPSHOT_KEY, 'earlier');
      render(
        <HomeAssistantProvider config={{ ...config, url: '' }}>
          <MetaProbe />
        </HomeAssistantProvider>
      );

      window.dispatchEvent(new Event('pagehide'));

      expect(sessionStorage.getItem(SNAPSHOT_KEY)).toBe('earlier');
    });

    it('stops saving after unmount', async () => {
      await connect();
      cleanup();

      window.dispatchEvent(new Event('pagehide'));

      expect(sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull();
    });
  });
});
