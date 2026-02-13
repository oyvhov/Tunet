import { describe, it, expect } from 'vitest';
import { getCardGridSpan, buildGridLayout } from '../utils/gridLayout';

// ═════════════════════════════════════════════════════════════════════════
// getCardGridSpan
// ═════════════════════════════════════════════════════════════════════════
describe('getCardGridSpan', () => {
  const identity = (id) => id;

  it('returns 1 for small lights', () => {
    const settings = { 'light_abc': { size: 'small' } };
    expect(getCardGridSpan('light_abc', identity, settings, 'home')).toBe(1);
  });

  it('returns 2 for default lights', () => {
    expect(getCardGridSpan('light_abc', identity, {}, 'home')).toBe(2);
  });

  it('returns 1 for small calendar cards', () => {
    const settings = { 'calendar_card_1': { size: 'small' } };
    expect(getCardGridSpan('calendar_card_1', identity, settings, 'home')).toBe(1);
  });

  it('returns 2 for medium calendar cards', () => {
    const settings = { 'calendar_card_1': { size: 'medium' } };
    expect(getCardGridSpan('calendar_card_1', identity, settings, 'home')).toBe(2);
  });

  it('returns 4 for default (large) calendar cards', () => {
    expect(getCardGridSpan('calendar_card_1', identity, {}, 'home')).toBe(4);
  });

  it('returns 1 for small car cards', () => {
    const settings = { 'car_card_1': { size: 'small' } };
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

  it('returns 1 for small room cards', () => {
    const settings = { 'room_card_1': { size: 'small' } };
    expect(getCardGridSpan('room_card_1', identity, settings, 'home')).toBe(1);
  });

  it('returns 2 for default room cards', () => {
    expect(getCardGridSpan('room_card_1', identity, {}, 'home')).toBe(2);
  });

  it('uses getCardSettingsKey to resolve settings', () => {
    const keyFn = (id) => `page_home_${id}`;
    const settings = { 'page_home_light_abc': { size: 'small' } };
    expect(getCardGridSpan('light_abc', keyFn, settings, 'home')).toBe(1);
  });

  it('handles legacy "car" id', () => {
    expect(getCardGridSpan('car', identity, {}, 'home')).toBe(2);
    const settings = { 'car': { size: 'small' } };
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
    expect(result.a).toEqual({ row: 1, col: 1, span: 1 });
    expect(result.b).toEqual({ row: 1, col: 2, span: 1 });
    expect(result.c).toEqual({ row: 2, col: 1, span: 1 });
  });

  it('places double-span cards correctly', () => {
    const result = buildGridLayout(['a', 'b'], 2, spanOf(2));
    // Each span-2 card fills both columns of one row
    expect(result.a).toEqual({ row: 1, col: 1, span: 2 });
    expect(result.b).toEqual({ row: 1, col: 2, span: 2 });
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
