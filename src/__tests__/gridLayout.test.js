import { describe, it, expect } from 'vitest';
import { getCardGridSpan, getCardColSpan, buildGridLayout } from '../utils/gridLayout';

// ═════════════════════════════════════════════════════════════════════════
// getCardGridSpan
// ═════════════════════════════════════════════════════════════════════════
describe('getCardGridSpan', () => {
  const identity = (id) => id;

  it('returns 1 for small lights', () => {
    const settings = { light_abc: { size: 'small' } };
    expect(getCardGridSpan('light_abc', identity, settings, 'home')).toBe(1);
  });

  it('returns 2 for default lights', () => {
    expect(getCardGridSpan('light_abc', identity, {}, 'home')).toBe(2);
  });

  it('returns 1 for small calendar cards', () => {
    const settings = { calendar_card_1: { size: 'small' } };
    expect(getCardGridSpan('calendar_card_1', identity, settings, 'home')).toBe(1);
  });

  it('returns 2 for medium calendar cards', () => {
    const settings = { calendar_card_1: { size: 'medium' } };
    expect(getCardGridSpan('calendar_card_1', identity, settings, 'home')).toBe(2);
  });

  it('returns 4 for default (large) calendar cards', () => {
    expect(getCardGridSpan('calendar_card_1', identity, {}, 'home')).toBe(4);
  });

  it('returns 1 for small car cards', () => {
    const settings = { car_card_1: { size: 'small' } };
    expect(getCardGridSpan('car_card_1', identity, settings, 'home')).toBe(1);
  });

  it('returns 2 for default car cards', () => {
    expect(getCardGridSpan('car_card_1', identity, {}, 'home')).toBe(2);
  });

  it('returns 1 for automation with sensor type and small size', () => {
    const settings = { 'automation.test': { type: 'sensor', size: 'small' } };
    expect(getCardGridSpan('automation.test', identity, settings, 'home')).toBe(1);
  });

  it('returns 2 for automation with sensor type and no small size', () => {
    const settings = { 'automation.test': { type: 'sensor' } };
    expect(getCardGridSpan('automation.test', identity, settings, 'home')).toBe(2);
  });

  it('returns 1 for automation without sensor/entity/toggle type', () => {
    const settings = { 'automation.test': { type: 'other' } };
    expect(getCardGridSpan('automation.test', identity, settings, 'home')).toBe(1);
  });

  it('returns 2 for weather_temp_ cards', () => {
    expect(getCardGridSpan('weather_temp_abc', identity, {}, 'home')).toBe(2);
  });

  it('returns 1 for generic small cards', () => {
    const settings = { 'sensor.xyz': { size: 'small' } };
    expect(getCardGridSpan('sensor.xyz', identity, settings, 'home')).toBe(1);
  });

  it('returns 1 for settings page non-special cards', () => {
    expect(getCardGridSpan('sensor.xyz', identity, {}, 'settings')).toBe(1);
  });

  it('returns 2 for default generic cards on non-settings page', () => {
    expect(getCardGridSpan('sensor.xyz', identity, {}, 'home')).toBe(2);
  });

  it('sizes sensor instances independently of their source entity domain', () => {
    const settings = { entity_card_1: { size: 'small', entityId: 'climate.living_room' } };
    expect(getCardGridSpan('entity_card_1', identity, settings, 'home')).toBe(1);
    expect(getCardGridSpan('entity_card_2', identity, {}, 'home')).toBe(2);
  });

  it('returns 1 for small room cards', () => {
    const settings = { room_card_1: { size: 'small' } };
    expect(getCardGridSpan('room_card_1', identity, settings, 'home')).toBe(1);
  });

  it('returns 2 for default room cards', () => {
    expect(getCardGridSpan('room_card_1', identity, {}, 'home')).toBe(2);
  });

  it('returns estimated spacer span when heightPx is set', () => {
    const settings = { spacer_card_1: { heightPx: 260 } };
    expect(getCardGridSpan('spacer_card_1', identity, settings, 'home')).toBe(3);
  });

  it('supports legacy spacer heightRows setting', () => {
    const settings = { spacer_card_1: { heightRows: 3 } };
    expect(getCardGridSpan('spacer_card_1', identity, settings, 'home')).toBe(3);
  });

  it('uses runtime row/gap metrics for spacer heightPx span', () => {
    const settings = { spacer_card_1: { heightPx: 420 } };
    const metrics = { rowPx: 82, gapPx: 12 };
    expect(getCardGridSpan('spacer_card_1', identity, settings, 'home', metrics)).toBe(5);
  });

  it('falls back to size behavior for spacer when heightRows is not set', () => {
    const settings = { spacer_card_1: { size: 'small' } };
    expect(getCardGridSpan('spacer_card_1', identity, settings, 'home')).toBe(1);
    expect(getCardGridSpan('spacer_card_2', identity, {}, 'home')).toBe(2);
  });

  it('uses getCardSettingsKey to resolve settings', () => {
    const keyFn = (id) => `page_home_${id}`;
    const settings = { page_home_light_abc: { size: 'small' } };
    expect(getCardGridSpan('light_abc', keyFn, settings, 'home')).toBe(1);
  });

  it('handles legacy "car" id', () => {
    expect(getCardGridSpan('car', identity, {}, 'home')).toBe(2);
    const settings = { car: { size: 'small' } };
    expect(getCardGridSpan('car', identity, settings, 'home')).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// buildGridLayout
// ═════════════════════════════════════════════════════════════════════════
describe('buildGridLayout', () => {
  const spanOf = (n) => () => n;

  it('returns empty for 0 columns', () => {
    expect(buildGridLayout(['a', 'b'], 0, spanOf(1))).toEqual({});
  });

  it('returns empty for undefined columns', () => {
    expect(buildGridLayout(['a'], undefined, spanOf(1))).toEqual({});
  });

  it('places single-span cards in a 2-col grid', () => {
    const result = buildGridLayout(['a', 'b', 'c'], 2, spanOf(1));
    expect(result.a).toEqual({ row: 1, col: 1, span: 1, colSpan: 1 });
    expect(result.b).toEqual({ row: 1, col: 2, span: 1, colSpan: 1 });
    expect(result.c).toEqual({ row: 2, col: 1, span: 1, colSpan: 1 });
  });

  it('places double-span cards correctly', () => {
    const result = buildGridLayout(['a', 'b'], 2, spanOf(2));
    // Each span-2 card fills both columns of one row
    expect(result.a).toEqual({ row: 1, col: 1, span: 2, colSpan: 1 });
    expect(result.b).toEqual({ row: 1, col: 2, span: 2, colSpan: 1 });
  });

  it('handles mixed spans', () => {
    const spanFn = (id) => (id === 'big' ? 2 : 1);
    const result = buildGridLayout(['small1', 'big', 'small2'], 2, spanFn);
    expect(result.small1.span).toBe(1);
    expect(result.big.span).toBe(2);
    expect(result.small2.span).toBe(1);
  });

  it('returns empty object for empty ids', () => {
    expect(buildGridLayout([], 4, spanOf(1))).toEqual({});
  });
});

describe('getCardColSpan', () => {
  const identity = (id) => id;

  it('returns full width sentinel for colSpan=full', () => {
    const settings = { spacer_card_1: { colSpan: 'full' } };
    expect(getCardColSpan('spacer_card_1', identity, settings)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('returns numeric colSpan when provided', () => {
    const settings = { spacer_card_1: { colSpan: 3 } };
    expect(getCardColSpan('spacer_card_1', identity, settings)).toBe(3);
  });

  it('automatically gives wide mobile cards enough columns to remain readable', () => {
    expect(
      getCardColSpan(
        'media_player.living_room',
        identity,
        {},
        {
          isMobile: true,
          gridColumns: 2,
          viewportWidth: 390,
          gridGapH: 12,
        }
      )
    ).toBe(2);
    expect(
      getCardColSpan(
        'weather_temp_home',
        identity,
        {},
        {
          isMobile: true,
          gridColumns: 2,
          viewportWidth: 390,
          gridGapH: 12,
        }
      )
    ).toBe(1);
  });

  it('allows compact and full-width mobile overrides without changing desktop width', () => {
    const settings = {
      'media_player.living_room': { mobileWidth: 'compact' },
      climate_card_bedroom: { mobileWidth: 'full' },
    };
    const mobileOptions = {
      isMobile: true,
      gridColumns: 2,
      viewportWidth: 390,
      gridGapH: 12,
    };

    expect(getCardColSpan('media_player.living_room', identity, settings, mobileOptions)).toBe(1);
    expect(getCardColSpan('climate_card_bedroom', identity, settings, mobileOptions)).toBe(
      Number.MAX_SAFE_INTEGER
    );
    expect(getCardColSpan('climate_card_bedroom', identity, settings)).toBe(1);
  });

  it('uses the mapped domain and per-instance mobile width for sensor cards', () => {
    const options = { isMobile: true, gridColumns: 2, viewportWidth: 390, gridGapH: 12 };
    const settings = {
      entity_card_1: { entityId: 'climate.aircondition' },
      entity_card_2: { entityId: 'scene.night', mobileWidth: 'full' },
      entity_card_3: { entityId: 'climate.aircondition', mobileWidth: 'compact' },
    };
    expect(getCardColSpan('entity_card_1', identity, settings, options)).toBe(2);
    expect(getCardColSpan('entity_card_2', identity, settings, options)).toBe(
      Number.MAX_SAFE_INTEGER
    );
    expect(getCardColSpan('entity_card_3', identity, settings, options)).toBe(1);
    expect(getCardColSpan('entity_card_2', identity, settings)).toBe(1);
  });

  it('keeps small toggle cards on one column because their icon is the switch', () => {
    const options = { isMobile: true, gridColumns: 2, viewportWidth: 390, gridGapH: 12 };
    for (const entityId of ['switch.fan', 'light.hall', 'input_boolean.mode', 'automation.night']) {
      const settings = { entity_card_1: { entityId, size: 'small' } };
      expect(getCardColSpan('entity_card_1', identity, settings, options)).toBe(1);
    }
  });

  it('gives standard small primary actions and actions on other targets room on mobile', () => {
    const options = { isMobile: true, gridColumns: 2, viewportWidth: 390, gridGapH: 12 };
    for (const entityId of [
      'scene.night',
      'script.goodnight',
      'button.restart',
      'input_button.night',
      'climate.room',
    ]) {
      expect(
        getCardColSpan(
          'entity_card_1',
          identity,
          { entity_card_1: { entityId, size: 'small' } },
          options
        )
      ).toBe(2);
    }
    const settings = {
      entity_card_1: {
        entityId: 'sensor.temperature',
        size: 'small',
        sensorAction: { type: 'toggle', entityId: 'climate.room' },
      },
    };
    expect(getCardColSpan('entity_card_1', identity, settings, options)).toBe(2);
  });

  it('keeps plain numeric and suppressed sensor controls compact on mobile', () => {
    const options = { isMobile: true, gridColumns: 2, viewportWidth: 390, gridGapH: 12 };
    for (const settings of [
      { entityId: 'sensor.temperature', size: 'small' },
      { entityId: 'scene.night', size: 'small', showControls: false },
      {
        entityId: 'scene.night',
        size: 'small',
        sensorAction: { type: 'none' },
      },
      {
        entityId: 'scene.night',
        size: 'small',
        sensorAction: { trigger: 'icon' },
      },
      {
        entityId: 'scene.night',
        size: 'small',
        sensorAction: { trigger: 'card' },
      },
      { entityId: 'scene.night', size: 'small', mobileWidth: 'compact' },
    ]) {
      expect(getCardColSpan('entity_card_1', identity, { entity_card_1: settings }, options)).toBe(
        1
      );
    }
  });
  it('ignores malformed stored entity ids instead of breaking the whole layout', () => {
    const options = { isMobile: true, gridColumns: 2, viewportWidth: 390, gridGapH: 12 };
    for (const settings of [
      { entityId: 42, size: 'small' },
      { entityId: { id: 'sensor.temperature' } },
      { entityId: 'sensor.temperature', sensorAction: { entityId: 7, type: 'toggle' } },
    ]) {
      expect(() =>
        getCardColSpan('entity_card_1', identity, { entity_card_1: settings }, options)
      ).not.toThrow();
    }
  });
});
