import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../contexts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../contexts')>()),
  useConfig: () => ({ unitsMode: 'metric', config: {}, language: 'nn' }),
  useHomeAssistantMeta: () => ({
    haConfig: { unit_system: { temperature: '°C' } },
    haUser: null,
  }),
}));

import { ModalEntitySlice } from '../rendering/modalSlices/ModalEntitySlice';

const thermostat = (id: string) => ({
  entity_id: id,
  state: 'heat',
  attributes: {
    friendly_name: id,
    temperature: 20,
    min_temp: 5,
    max_temp: 30,
    hvac_modes: ['heat'],
  },
});

const entities = {
  'climate.a': thermostat('climate.a'),
  'climate.b': thermostat('climate.b'),
};

const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

function renderSlice(callService: ReturnType<typeof vi.fn>, entityId: string) {
  const modals = new Proxy({ activeClimateEntityModal: { entityId } } as Record<string, unknown>, {
    get: (target, prop) => {
      if (prop in target) return target[prop as string];
      return typeof prop === 'string' && prop.startsWith('set') ? () => {} : null;
    },
  });
  return (
    <ModalEntitySlice
      core={{
        entities,
        conn: { connected: true },
        activeUrl: 'http://ha.test',
        authRef: { current: { accessToken: 'x' } },
        config: { token: 'x' },
        t: (key: string) => key,
        language: 'nn',
      }}
      modals={modals}
      cardConfig={{
        cardSettings: {},
        saveCardSetting: () => {},
        customNames: {},
        customIcons: {},
        getCardSettingsKey: (id: string) => id,
      }}
      entityHelpers={{
        callService,
        getA: () => null,
        getS: () => '--',
        getEntityImageUrl: (url: string) => url,
        optimisticLightBrightness: {},
        setOptimisticLightBrightness: () => {},
        hvacMap: { heat: 'heat' },
        fanMap: {},
        swingMap: {},
      }}
      resolveCarSettings={(_id: string, value: unknown) => value}
    />
  );
}

describe('climate popup that changes thermostat', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('sends a queued temperature to the thermostat it was set on', async () => {
    const callService = vi.fn(async () => ({}));
    const view = render(renderSlice(callService, 'climate.a'));
    for (let attempt = 0; attempt < 100 && !document.querySelector('.lucide-plus'); attempt += 1) {
      await wait(50);
    }

    const plus = document.querySelector('.lucide-plus')?.closest('button') as HTMLButtonElement;
    fireEvent.click(plus);
    view.rerender(renderSlice(callService, 'climate.b'));
    await wait(450);

    const sent = callService.mock.calls.filter(
      (call: unknown[]) => call[0] === 'climate' && call[1] === 'set_temperature'
    );
    expect(sent).toEqual([
      ['climate', 'set_temperature', { entity_id: 'climate.a', temperature: 20.5 }],
    ]);
  }, 20_000);
});
