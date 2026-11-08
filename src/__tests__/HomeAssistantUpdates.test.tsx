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

vi.mock('../services/haClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/haClient')>()),
  getEntityRegistry: vi.fn(async () => [{ entity_id: 'light.a', device_id: 'd1' }]),
  getDeviceRegistry: vi.fn(async () => [{ id: 'd1', name: 'Lamp' }]),
}));

vi.mock('../hooks/useMobileConnectionRecovery', () => ({
  useMobileConnectionRecovery: vi.fn(),
}));

const config = { url: 'http://ha.local:8123', token: 'test-token', authMethod: 'token' };

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

  it('flags stale data after a silent minute and clears it on the next update', async () => {
    await connect();
    expect(latestMeta.entityDataStale).toBe(false);

    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(latestMeta.entityDataStale).toBe(true);

    act(() => haws.emit(light('off')));
    expect(latestMeta.entityDataStale).toBe(false);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(latestMeta.entityDataStale).toBe(false);
  });
});
