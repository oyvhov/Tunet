import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../contexts', async (importOriginal) => ({
  ...(await importOriginal()),
  useConfig: () => ({ unitsMode: 'metric', config: {}, language: 'nn' }),
  useHomeAssistantMeta: () => ({
    haConfig: { unit_system: { temperature: '°C', length: 'km' }, time_zone: 'Europe/Oslo' },
    haUser: null,
  }),
}));

import { dispatchCardRender } from '../rendering/registry';
import { ModalEntitySlice } from '../rendering/modalSlices/ModalEntitySlice';

const KEPT_ATTRIBUTES = [
  'supported_features',
  'hvac_modes',
  'min_temp',
  'max_temp',
  'unit_of_measurement',
  'preset_modes',
  'fan_modes',
  'source_list',
  'fan_speed_list',
  'min',
  'max',
  'step',
];

const unavailable = (spec) =>
  Object.fromEntries(
    Object.entries(spec).map(([id, attributes]) => [
      id,
      {
        entity_id: id,
        state: 'unavailable',
        attributes: {
          friendly_name: id,
          ...Object.fromEntries(
            Object.entries(attributes).filter(([key]) => KEPT_ATTRIBUTES.includes(key))
          ),
        },
        last_updated: new Date().toISOString(),
        last_changed: new Date().toISOString(),
      },
    ])
  );

const fan = { 'fan.stue': { supported_features: 63, preset_modes: ['auto'] } };
const climate = {
  'climate.stue': {
    hvac_modes: ['off', 'heat'],
    fan_modes: ['auto'],
    min_temp: 5,
    max_temp: 30,
    supported_features: 9,
  },
};
const vacuum = { 'vacuum.rocky': { supported_features: 16383, fan_speed_list: ['auto', 'max'] } };
const mower = { 'lawn_mower.plen': { supported_features: 7 } };
const shield = {
  'media_player.shield': { supported_features: 152463, source_list: ['Netflix'] },
  'remote.shield': {},
};
const atv = {
  'media_player.atv': { supported_features: 152463, source_list: ['TV'] },
  'remote.atv': {},
};
const car = {
  'sensor.bat': { unit_of_measurement: '%' },
  'lock.bil': {},
  'climate.bil': { hvac_modes: ['off', 'heat_cool'], min_temp: 16, max_temp: 28 },
};
const number = { 'input_number.mal': { min: 5, max: 30, step: 1 } };
const room = { 'light.a': {} };

const CARD_CASES = [
  ['fan', 'fan.stue', {}, fan],
  ['climate', 'climate_card_1', { climateId: 'climate.stue' }, climate],
  ['vacuum', 'vacuum.rocky', {}, vacuum],
  ['mower', 'lawn_mower.plen', {}, mower],
  ['automation', 'automation.morgon', {}, { 'automation.morgon': {} }],
  ['number', 'entity_card_n', { entityId: 'input_number.mal', type: 'entity' }, number],
  ['room', 'room_card_1', { areaId: 'a', areaName: 'A', entityIds: ['light.a'] }, room],
];

const POPUP_CASES = [
  ['fan', { showFanModal: 'fan.stue' }, {}, fan],
  ['climate', { activeClimateEntityModal: { entityId: 'climate.stue' } }, {}, climate],
  ['vacuum', { showVacuumModal: true, activeVacuumId: 'vacuum.rocky' }, {}, vacuum],
  [
    'android tv',
    { showAndroidTVModal: 'androidtv_card_1' },
    { androidtv_card_1: { mediaPlayerId: 'media_player.shield', remoteId: 'remote.shield' } },
    shield,
  ],
  [
    'apple tv',
    { showAppleTVModal: 'appletv_card_1' },
    { appletv_card_1: { mediaPlayerId: 'media_player.atv', remoteId: 'remote.atv' } },
    atv,
  ],
  [
    'car',
    { activeCarModal: 'car_card_1' },
    { car_card_1: { batteryId: 'sensor.bat', lockId: 'lock.bil', climateId: 'climate.bil' } },
    car,
  ],
];

const LABEL_CASES = [
  ['fan', 'fan.stue', {}, fan],
  ['automation', 'automation.morgon', {}, { 'automation.morgon': {} }],
  [
    'apple tv',
    'appletv_card_1',
    { mediaPlayerId: 'media_player.atv', remoteId: 'remote.atv' },
    atv,
  ],
  ['media', 'media_player.sonos', {}, { 'media_player.sonos': { supported_features: 152463 } }],
  ['nordpool', 'nordpool_card_1', { nordpoolId: 'sensor.np' }, { 'sensor.np': {} }],
];

const CONTROLS = 'button, [role="button"], [role="switch"], input, select';

const makeHelpers = (entities) => ({
  callService: vi.fn(async () => ({})),
  getEntityImageUrl: (url) => url,
  getA: (id, attr, fallback = null) => entities[id]?.attributes?.[attr] ?? fallback,
  getS: (id, fallback = '--') => {
    const state = entities[id]?.state;
    return !state || state === 'unavailable' || state === 'unknown' ? fallback : state;
  },
  optimisticLightBrightness: {},
  setOptimisticLightBrightness: () => {},
  hvacMap: { off: 'off', heat: 'heat' },
  fanMap: {},
  swingMap: {},
});

const conn = () => ({
  connected: true,
  sendMessagePromise: vi.fn(async () => ({})),
  subscribeMessage: vi.fn(async () => () => {}),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

function renderCard(cardId, settings, spec) {
  const entities = unavailable(spec);
  const helpers = makeHelpers(entities);
  const base = {
    ...helpers,
    entities,
    entitiesLoaded: true,
    entitiesMissingReady: true,
    editMode: false,
    conn: conn(),
    cardSettings: { [`home::${cardId}`]: settings },
    customNames: {},
    customIcons: {},
    isMediaActive: () => false,
    saveCardSetting: () => {},
    language: 'nn',
    isMobile: false,
    isFullWidthMobileCard: false,
    activePage: 'home',
    t: (key) => key,
    tempHistoryById: {},
    forecastsById: {},
    isCardHiddenByLogic: () => false,
    openMediaModal: () => {},
  };
  const ctx = new Proxy(base, {
    get: (target, prop) =>
      prop in target || typeof prop !== 'string' || !/^set[A-Z]/.test(prop) ? target[prop] : () => {},
  });
  const node = dispatchCardRender(cardId, {}, () => null, {}, `home::${cardId}`, ctx);
  return { ...render(node), callService: helpers.callService };
}

async function pressEverything(root) {
  const count = root.querySelectorAll(CONTROLS).length;
  for (let index = 0; index < count; index += 1) {
    const element = root.querySelectorAll(CONTROLS)[index];
    if (!element || element.disabled || /common\.close/.test(element.getAttribute('aria-label')))
      continue;
    await act(async () => {
      if (element.type === 'range') {
        fireEvent.change(element, { target: { value: String(Number(element.max || 100) * 0.7) } });
      } else if (!['INPUT', 'SELECT'].includes(element.tagName)) {
        fireEvent.click(element);
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
  }
}

async function openPopup(modalState, settings, spec) {
  const entities = unavailable(spec);
  const helpers = makeHelpers(entities);
  const modals = new Proxy(
    { ...modalState },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return typeof prop === 'string' && prop.startsWith('set') ? () => {} : null;
      },
    }
  );
  await act(async () => {
    render(
      <ModalEntitySlice
        core={{
          entities,
          conn: conn(),
          activeUrl: 'http://ha.test',
          authRef: { current: { accessToken: 'x' } },
          config: { token: 'x' },
          t: (key) => key,
          language: 'nn',
        }}
        modals={modals}
        cardConfig={{
          cardSettings: Object.fromEntries(
            Object.entries(settings).map(([id, value]) => [`home::${id}`, value])
          ),
          saveCardSetting: () => {},
          customNames: {},
          customIcons: {},
          getCardSettingsKey: (id) => `home::${id}`,
        }}
        entityHelpers={helpers}
        resolveCarSettings={(_id, value) => value}
      />
    );
  });
  for (let attempt = 0; attempt < 100 && !document.querySelector('[role="dialog"]'); attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  }
  return helpers;
}

describe('entities that are unavailable', () => {
  beforeAll(() => {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it.each(CARD_CASES)('%s card sends nothing', async (_name, cardId, settings, spec) => {
    const { container, callService } = renderCard(cardId, settings, spec);
    await pressEverything(container);
    fireEvent.click(container.firstElementChild);
    expect(callService).not.toHaveBeenCalled();
  });

  it.each(POPUP_CASES)(
    '%s popup sends nothing',
    async (_name, modalState, settings, spec) => {
      const { callService } = await openPopup(modalState, settings, spec);
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      await pressEverything(document.body);
      expect(callService).not.toHaveBeenCalled();
    },
    30000
  );

  it.each(LABEL_CASES)('%s card says so', (_name, cardId, settings, spec) => {
    const { container } = renderCard(cardId, settings, spec);
    expect(container).toHaveTextContent('status.unavailable');
  });

  it('nordpool shows no price instead of zero', () => {
    const { container } = renderCard('nordpool_card_1', { nordpoolId: 'sensor.np' }, { 'sensor.np': {} });
    expect(container).not.toHaveTextContent('0kr');
  });
});
