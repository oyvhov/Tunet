import { beforeEach, describe, expect, it, vi } from 'vitest';

const rendererMocks = vi.hoisted(() => ({
  renderSensorCard: vi.fn(() => ({ renderer: 'sensor' })),
  renderLightCard: vi.fn(() => ({ renderer: 'light' })),
  renderAutomationCard: vi.fn(() => ({ renderer: 'automation' })),
  renderCarCard: vi.fn(() => ({ renderer: 'car' })),
  renderVacuumCard: vi.fn(() => ({ renderer: 'vacuum' })),
  renderFanCard: vi.fn(() => ({ renderer: 'fan' })),
  renderMediaPlayerCard: vi.fn(() => ({ renderer: 'media_player' })),
  renderMediaGroupCard: vi.fn(() => ({ renderer: 'media_group' })),
  renderWeatherTempCard: vi.fn(() => ({ renderer: 'weather_temp' })),
  renderGenericClimateCard: vi.fn(() => ({ renderer: 'climate' })),
  renderGenericCostCard: vi.fn(() => ({ renderer: 'cost' })),
  renderGenericAndroidTVCard: vi.fn(() => ({ renderer: 'androidtv' })),
  renderCalendarCard: vi.fn(() => ({ renderer: 'calendar' })),
  renderTodoCard: vi.fn(() => ({ renderer: 'todo' })),
  renderNordpoolCard: vi.fn(() => ({ renderer: 'nordpool' })),
  renderCoverCard: vi.fn(() => ({ renderer: 'cover' })),
  renderAlarmCard: vi.fn(() => ({ renderer: 'alarm' })),
  renderRoomCard: vi.fn(() => ({ renderer: 'room' })),
  renderCameraCard: vi.fn(() => ({ renderer: 'camera' })),
  renderSpacerCard: vi.fn(() => ({ renderer: 'spacer' })),
}));

vi.mock('../rendering/cards', () => rendererMocks);
vi.mock('../components', () => ({
  MissingEntityCard: function MissingEntityCard() {
    return null;
  },
}));

import { CARD_REGISTRY, dispatchCardRender } from '../rendering/registry';

const base = () => ({
  dragProps: {},
  getControls: vi.fn(() => 'controls'),
  cardStyle: {},
  settingsKey: 'k1',
  ctx: {
    editMode: false,
    cardSettings: {},
    activePage: 'home',
    t: (key) => key,
  },
});

describe('rendering registry dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes known split-card prefixes', () => {
    expect(CARD_REGISTRY.some((entry) => entry.prefix === 'cover_card_')).toBe(true);
    expect(CARD_REGISTRY.some((entry) => entry.prefix === 'camera_card_')).toBe(true);
  });

  it('routes automation card to sensor renderer for sensor-like types', () => {
    const { dragProps, getControls, cardStyle, settingsKey, ctx } = base();
    ctx.cardSettings = { [settingsKey]: { type: 'sensor' } };

    const result = dispatchCardRender(
      'automation.office',
      dragProps,
      getControls,
      cardStyle,
      settingsKey,
      ctx
    );

    expect(result).toEqual({ renderer: 'sensor' });
    expect(rendererMocks.renderSensorCard).toHaveBeenCalledOnce();
    expect(rendererMocks.renderAutomationCard).not.toHaveBeenCalled();
  });

  it('routes automation card to automation renderer for non-sensor type', () => {
    const { dragProps, getControls, cardStyle, settingsKey, ctx } = base();
    ctx.cardSettings = { [settingsKey]: { type: 'automation' } };

    const result = dispatchCardRender(
      'automation.garage',
      dragProps,
      getControls,
      cardStyle,
      settingsKey,
      ctx
    );

    expect(result).toEqual({ renderer: 'automation' });
    expect(rendererMocks.renderAutomationCard).toHaveBeenCalledOnce();
  });

  it('routes by registry prefix', () => {
    const { dragProps, getControls, cardStyle, settingsKey, ctx } = base();

    const result = dispatchCardRender(
      'light_kitchen',
      dragProps,
      getControls,
      cardStyle,
      settingsKey,
      ctx
    );

    expect(result).toEqual({ renderer: 'light' });
    expect(rendererMocks.renderLightCard).toHaveBeenCalledOnce();
  });

  it('uses sensor renderer on settings page fallback', () => {
    const { dragProps, getControls, cardStyle, settingsKey, ctx } = base();
    ctx.activePage = 'settings';

    const result = dispatchCardRender(
      'binary_sensor.custom',
      dragProps,
      getControls,
      cardStyle,
      settingsKey,
      ctx
    );

    expect(result).toEqual({ renderer: 'sensor' });
    expect(rendererMocks.renderSensorCard).toHaveBeenCalledOnce();
  });

  it('renders legacy media placeholder in edit mode', () => {
    const { dragProps, getControls, cardStyle, settingsKey, ctx } = base();
    ctx.editMode = true;

    const result = dispatchCardRender(
      'media_player',
      dragProps,
      getControls,
      cardStyle,
      settingsKey,
      ctx
    );

    expect(result?.props?.label).toBe('Legacy');
    expect(result?.props?.controls).toBe('controls');
    expect(getControls).toHaveBeenCalledWith('media_player');
  });

  it('routes legacy car id to car renderer', () => {
    const { dragProps, getControls, cardStyle, settingsKey, ctx } = base();

    const result = dispatchCardRender('car', dragProps, getControls, cardStyle, settingsKey, ctx);

    expect(result).toEqual({ renderer: 'car' });
    expect(rendererMocks.renderCarCard).toHaveBeenCalledOnce();
  });

  it('returns null for unknown card outside edit/settings fallbacks', () => {
    const { dragProps, getControls, cardStyle, settingsKey, ctx } = base();

    const result = dispatchCardRender(
      'unknown.card',
      dragProps,
      getControls,
      cardStyle,
      settingsKey,
      ctx
    );

    expect(result).toBeNull();
  });
});
