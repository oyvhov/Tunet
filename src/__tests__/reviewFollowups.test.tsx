import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePopupTriggers } from '../hooks/usePopupTriggers';
import { getCardEntityFields } from '../modals/editCard/cardEntityFields';
import { createDefaultConditionRule } from '../utils/conditionUtils';
import { isCardHiddenByLogic } from '../utils/cardUtils';
import { buildCostIncrementBuckets } from '../utils/costSeries';
import { getChunkReloadWait } from '../utils/chunkReload';

vi.mock('../contexts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../contexts')>()),
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({ haConfig: { unit_system: { temperature: '°C' } } }),
}));

import SensorModal from '../modals/SensorModal';

type Entity = { entity_id: string; state: string; attributes: Record<string, unknown> };
const entity = (id: string, state: string, attributes: Record<string, unknown> = {}): Entity => ({
  entity_id: id,
  state,
  attributes,
});

describe('popup triggers follow the entity the card uses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T20:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  function trigger(cardId: string, settings: Record<string, unknown>, watched: string) {
    const modalActions = new Proxy(
      { closeAllModals: vi.fn() } as Record<string, ReturnType<typeof vi.fn>>,
      {
        get(target, prop: string) {
          target[prop] ||= vi.fn();
          return target[prop];
        },
      }
    );
    const fullSettings = {
      ...settings,
      popupTrigger: {
        enabled: true,
        condition: { type: 'state', states: ['on'], entityId: watched },
      },
    };
    const hook = renderHook(
      ({ state }) =>
        usePopupTriggers({
          entities: { [watched]: { entity_id: watched, state } },
          entitiesLoaded: true,
          pagesConfig: { home: [cardId] },
          activePage: 'home',
          cardSettings: { [`home::${cardId}`]: fullSettings },
          getCardSettingsKey: (id: string, page: string) => `${page}::${id}`,
          editMode: false,
          modalActions,
        } as unknown as Parameters<typeof usePopupTriggers>[0]),
      { initialProps: { state: 'off' } }
    );
    act(() => vi.advanceTimersByTime(15001));
    hook.rerender({ state: 'on' });
    return modalActions;
  }

  it('opens the replaced fan', () => {
    const actions = trigger('fan.old', { entityId: 'fan.new' }, 'binary_sensor.x');
    expect(actions.setShowFanModal).toHaveBeenCalledWith('fan.new');
  });

  it('opens the replaced mower', () => {
    const actions = trigger('lawn_mower.old', { entityId: 'lawn_mower.new' }, 'binary_sensor.x');
    expect(actions.setActiveMowerId).toHaveBeenCalledWith('lawn_mower.new');
  });

  it('opens the replaced media player', () => {
    const actions = trigger(
      'media_player.old',
      { entityId: 'media_player.new' },
      'binary_sensor.x'
    );
    expect(actions.setActiveMediaId).toHaveBeenCalledWith('media_player.new');
  });

  it('opens the replaced lock', () => {
    const actions = trigger('lock.old', { lockId: 'lock.new' }, 'binary_sensor.x');
    expect(actions.setShowSensorInfoModal).toHaveBeenCalledWith({
      entityId: 'lock.new',
      cardId: 'lock.old',
    });
  });

  it('opens the calendar popup for that card', () => {
    const actions = trigger('calendar_card_1', {}, 'binary_sensor.x');
    expect(actions.setShowCalendarModal).toHaveBeenCalledWith('calendar_card_1');
  });
});

describe('card entity fields', () => {
  it('saves a direct lock card under entityId so a copy keeps the replacement', () => {
    expect(getCardEntityFields('lock.old', {}).map((field) => field.settingKey)).toEqual([
      'entityId',
    ]);
  });
});

describe('default visibility rule', () => {
  it('does not pin a reading that changes', () => {
    expect(createDefaultConditionRule(entity('sensor.temp', '21.5') as never)).toEqual({
      type: 'not_state',
      states: ['unavailable'],
      forSeconds: 0,
    });
  });

  it('still uses the current state for named states', () => {
    expect(createDefaultConditionRule(entity('climate.a', 'heat') as never).states).toEqual([
      'heat',
    ]);
  });
});

describe('visibility rules on cards without their own entity', () => {
  it('applies a rule that names its entity', () => {
    const hidden = isCardHiddenByLogic('spacer_card_1', {
      activePage: 'home',
      getCardSettingsKey: () => 'key',
      cardSettings: {
        key: {
          visibilityCondition: {
            enabled: true,
            rules: [{ type: 'state', states: ['on'], entityId: 'binary_sensor.x', forSeconds: 0 }],
          },
        },
      },
      entities: { 'binary_sensor.x': entity('binary_sensor.x', 'off') } as never,
    });
    expect(hidden).toBe(true);
  });
});

describe('cost per period', () => {
  const at = (hours: number) => new Date(Date.UTC(2026, 0, 10) + hours * 3_600_000);

  it('adds up what was spent, across the daily reset', () => {
    const points = [
      { value: 28, time: at(0) },
      { value: 30, time: at(10) },
      { value: 3, time: at(30) },
      { value: 9, time: at(40) },
    ];
    const buckets = buildCostIncrementBuckets(points, 72, at(47).getTime());
    expect(buckets.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(2 + 3 + 6);
  });

  it('treats a small correction as nothing spent, not as a new total', () => {
    const points = [
      { value: 30, time: at(0) },
      { value: 29, time: at(1) },
    ];
    const buckets = buildCostIncrementBuckets(points, 24, at(2).getTime());
    expect(buckets.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(0);
  });
});

describe('chunk reload', () => {
  const store = (value: string | null) => ({
    getItem: () => value,
    setItem: () => {},
  });

  it('says how long a refused reload must wait', () => {
    expect(getChunkReloadWait(store('1000'), 61_000)).toBe(5 * 60_000 - 60_000);
  });

  it('never returns a negative wait', () => {
    expect(getChunkReloadWait(store(null), 61_000)).toBe(0);
  });
});

describe('service worker install', () => {
  it('caches the scripts and styles of the new release for offline starts', async () => {
    const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf-8');
    const listeners: Record<string, (event: unknown) => void> = {};
    const stored: Record<string, string[]> = {};
    vm.runInNewContext(source, {
      self: {
        addEventListener: (type: string, callback: (event: unknown) => void) => {
          listeners[type] = callback;
        },
        skipWaiting: () => {},
        location: { origin: 'http://tunet.test' },
        clients: { claim: () => {} },
      },
      caches: {
        open: async (name: string) => ({
          addAll: async (urls: string[]) => {
            stored[name] = urls;
          },
        }),
      },
      fetch: async () => ({
        ok: true,
        text: async () =>
          '<script type="module" src="./assets/index-abc.js"></script>' +
          '<link rel="modulepreload" href="./assets/vendor-def.js">' +
          '<link rel="stylesheet" href="./assets/index-ghi.css"><link href="./favicon.ico">',
      }),
      URL,
    });
    let installed: Promise<unknown> = Promise.resolve();
    listeners.install({
      waitUntil: (promise: Promise<unknown>) => {
        installed = promise;
      },
    });
    await installed;
    expect(stored['tunet-assets-__APP_VERSION__']).toEqual([
      './assets/index-abc.js',
      './assets/vendor-def.js',
      './assets/index-ghi.css',
    ]);
  });
});

describe('sensor popup follows the card', () => {
  const script = entity('script.natt', 'off', { friendly_name: 'Natt' });
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    entityId: 'script.natt',
    entity: script,
    conn: { sendMessagePromise: vi.fn(async () => ({})) },
    haUrl: 'http://ha.test:8123',
    haToken: 'x',
    t: (key: string) => key,
  };

  it('hides the action when the card has none', () => {
    render(
      <SensorModal
        {...props}
        callService={vi.fn()}
        settings={{ entityId: 'script.natt', sensorAction: { type: 'none' } }}
      />
    );
    expect(screen.queryByRole('button', { name: /sensor\.script\.run/ })).toBeNull();
  });

  it('asks for a second tap when the card requires it', async () => {
    const callService = vi.fn(async () => ({}));
    render(
      <SensorModal
        {...props}
        callService={callService}
        settings={{
          entityId: 'script.natt',
          sensorAction: { type: 'script', confirm: true, confirmLabel: 'Sure?' },
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /sensor\.script\.run/ }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Sure\?/ }));
    await waitFor(() => expect(callService).toHaveBeenCalledTimes(1));
  });
});
