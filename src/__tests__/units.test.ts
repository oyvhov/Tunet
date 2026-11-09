import { describe, expect, it } from 'vitest';
import {
  convertValueByKind,
  formatKindValueForDisplay,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  getUnitModeFromUnit,
  inferUnitKind,
} from '../utils/units';
import type { UnitKind } from '../utils/units';

const HA_IMPERIAL = { unit_system: { temperature: '°F', length: 'mi' } };
const HA_METRIC = { unit_system: { temperature: '°C', length: 'km' } };

describe('getEffectiveUnitMode', () => {
  it('lets an explicit dashboard choice win over Home Assistant', () => {
    expect(getEffectiveUnitMode('metric', HA_IMPERIAL)).toBe('metric');
    expect(getEffectiveUnitMode('imperial', HA_METRIC)).toBe('imperial');
  });

  it('follows the Home Assistant unit system', () => {
    expect(getEffectiveUnitMode('follow_ha', HA_IMPERIAL)).toBe('imperial');
    expect(getEffectiveUnitMode('follow_ha', HA_METRIC)).toBe('metric');
  });

  it('reads the flat temperature_unit and length_unit fields too', () => {
    expect(getEffectiveUnitMode('follow_ha', { temperature_unit: '°F' })).toBe('imperial');
    expect(getEffectiveUnitMode('follow_ha', { length_unit: 'miles' })).toBe('imperial');
    expect(getEffectiveUnitMode('follow_ha', { temperature_unit: '°C', length_unit: 'km' })).toBe(
      'metric'
    );
  });

  it('treats feet as imperial even with a Celsius temperature unit', () => {
    expect(getEffectiveUnitMode('follow_ha', { temperature_unit: '°C', length_unit: 'ft' })).toBe(
      'imperial'
    );
  });

  it.each([null, undefined, {}, { unit_system: null }])(
    'falls back to metric when Home Assistant reports %j',
    (haConfig) => {
      expect(getEffectiveUnitMode('follow_ha', haConfig)).toBe('metric');
    }
  );

  it.each([null, undefined, '', 'nonsense'])('treats a %j mode as follow_ha', (mode) => {
    expect(getEffectiveUnitMode(mode, HA_IMPERIAL)).toBe('imperial');
  });
});

describe('inferUnitKind', () => {
  it.each([
    ['temperature', 'temperature'],
    ['apparent_temperature', 'temperature'],
    ['dew_point', 'temperature'],
    ['pressure', 'pressure'],
    ['atmospheric_pressure', 'pressure'],
    ['wind_speed', 'wind'],
    ['precipitation', 'precipitation'],
    ['precipitation_intensity', 'precipitation'],
  ])('maps device class %s to %s', (deviceClass, kind) => {
    expect(inferUnitKind(deviceClass, null)).toBe(kind);
  });

  it('prefers the device class over the unit', () => {
    expect(inferUnitKind('pressure', '°C')).toBe('pressure');
  });

  it.each([
    ['°C', 'temperature'],
    [' °f ', 'temperature'],
    ['km/h', 'wind'],
    ['km/t', 'wind'],
    ['m/s', 'wind'],
    ['MPH', 'wind'],
    ['knots', 'wind'],
    ['hPa', 'pressure'],
    ['mbar', 'pressure'],
    ['inHg', 'pressure'],
    ['psi', 'pressure'],
    ['mm', 'precipitation'],
    ['in', 'precipitation'],
    ['km', 'length'],
    ['mi', 'length'],
    ['feet', 'length'],
  ])('infers %j as %s when there is no device class', (unit, kind) => {
    expect(inferUnitKind(undefined, unit)).toBe(kind);
  });

  it.each(['W', 'kWh', '%', 'lx', '', null, undefined])('leaves %j unclassified', (unit) => {
    expect(inferUnitKind(null, unit)).toBeNull();
  });

  it('does not treat an unknown device class as a kind', () => {
    expect(inferUnitKind('power', 'W')).toBeNull();
  });
});

describe('getDisplayUnitForKind', () => {
  it.each<[UnitKind, string, string]>([
    ['temperature', '°C', '°F'],
    ['wind', 'km/h', 'mph'],
    ['pressure', 'hPa', 'inHg'],
    ['precipitation', 'mm', 'in'],
    ['length', 'km', 'mi'],
  ])('names the %s unit for each mode', (kind, metric, imperial) => {
    expect(getDisplayUnitForKind(kind, 'metric')).toBe(metric);
    expect(getDisplayUnitForKind(kind, 'imperial')).toBe(imperial);
  });

  it('returns no unit for an unknown kind', () => {
    expect(getDisplayUnitForKind(null, 'metric')).toBe('');
    expect(getDisplayUnitForKind(undefined, 'imperial')).toBe('');
  });
});

describe('getUnitModeFromUnit', () => {
  it.each<[UnitKind, string, string]>([
    ['temperature', '°F', 'imperial'],
    ['temperature', '°C', 'metric'],
    ['wind', 'mph', 'imperial'],
    ['wind', 'm/s', 'metric'],
    ['pressure', 'inHg', 'imperial'],
    ['pressure', 'hPa', 'metric'],
    ['precipitation', 'inches', 'imperial'],
    ['precipitation', 'mm', 'metric'],
    ['length', 'ft', 'imperial'],
    ['length', 'km', 'metric'],
  ])('classifies %s in %s as %s', (kind, unit, mode) => {
    expect(getUnitModeFromUnit(kind, unit)).toBe(mode);
  });
});

describe('convertValueByKind', () => {
  it.each<[UnitKind, string, number, 'metric' | 'imperial', number]>([
    ['temperature', '°C', 20, 'imperial', 68],
    ['temperature', '°F', 212, 'metric', 100],
    ['temperature', '°C', 20, 'metric', 20],
    ['temperature', '°F', 70, 'imperial', 70],
    ['wind', 'm/s', 10, 'metric', 36],
    ['wind', 'km/h', 36, 'metric', 36],
    ['wind', 'mph', 10, 'metric', 16.09344],
    ['wind', 'km/h', 100, 'imperial', 62.137],
    ['wind', 'kn', 10, 'imperial', 11.5078],
    ['pressure', 'Pa', 101300, 'metric', 1013],
    ['pressure', 'kPa', 101.3, 'metric', 1013],
    ['pressure', 'bar', 1.013, 'metric', 1013],
    ['pressure', 'hPa', 1013.25, 'imperial', 29.9213],
    ['pressure', 'inHg', 29.92, 'metric', 1013.2],
    ['pressure', 'psi', 14.7, 'metric', 1013.53],
    ['precipitation', 'cm', 2.5, 'metric', 25],
    ['precipitation', 'm', 0.01, 'metric', 10],
    ['precipitation', 'in', 1, 'metric', 25.4],
    ['precipitation', 'mm', 25.4, 'imperial', 1],
    ['length', 'km', 5, 'metric', 5],
    ['length', 'mi', 1, 'metric', 1.609344],
    ['length', 'ft', 5280, 'imperial', 1],
    ['length', 'm', 1609.344, 'imperial', 1],
    ['length', 'km', 1.609344, 'imperial', 1],
  ])('converts %s from %s: %d to %s', (kind, fromUnit, value, unitMode, expected) => {
    expect(convertValueByKind(value, { kind, fromUnit, unitMode })).toBeCloseTo(expected, 1);
  });

  it('parses numeric strings as Home Assistant sends them', () => {
    expect(
      convertValueByKind('20.5', { kind: 'temperature', fromUnit: '°C', unitMode: 'imperial' })
    ).toBeCloseTo(68.9, 5);
  });

  it.each([null, undefined, '', 'unavailable', 'unknown', Number.NaN, Infinity])(
    'returns null for %j in every kind',
    (value) => {
      for (const kind of ['temperature', 'wind', 'pressure', 'precipitation', 'length'] as const) {
        expect(convertValueByKind(value, { kind, fromUnit: 'x', unitMode: 'metric' })).toBeNull();
      }
    }
  );

  it('treats zero as a value, not as missing', () => {
    expect(
      convertValueByKind(0, { kind: 'temperature', fromUnit: '°C', unitMode: 'imperial' })
    ).toBe(32);
  });

  it('assumes the base unit when the source unit is unknown', () => {
    expect(
      convertValueByKind(20, { kind: 'temperature', fromUnit: null, unitMode: 'metric' })
    ).toBe(20);
    expect(convertValueByKind(10, { kind: 'wind', fromUnit: 'furlongs', unitMode: 'metric' })).toBe(
      36
    );
  });

  it('passes the number through without a resolved mode or known kind', () => {
    expect(
      convertValueByKind('20', { kind: 'temperature', fromUnit: '°F', unitMode: 'follow_ha' })
    ).toBe(20);
    expect(convertValueByKind('20', { kind: 'temperature', fromUnit: '°F' })).toBe(20);
    expect(convertValueByKind('20', { kind: null, fromUnit: 'W', unitMode: 'metric' })).toBe(20);
  });
});

describe('formatUnitValue', () => {
  it('uses one decimal by default and drops a trailing zero', () => {
    expect(
      formatUnitValue(21.34, { kind: 'temperature', fromUnit: '°C', unitMode: 'metric' })
    ).toBe('21.3');
    expect(formatUnitValue(21, { kind: 'temperature', fromUnit: '°C', unitMode: 'metric' })).toBe(
      '21'
    );
  });

  it('rounds pressure to whole hPa and two decimals of inHg', () => {
    expect(
      formatUnitValue(1013.25, { kind: 'pressure', fromUnit: 'hPa', unitMode: 'metric' })
    ).toBe('1013');
    expect(
      formatUnitValue(1013.25, { kind: 'pressure', fromUnit: 'hPa', unitMode: 'imperial' })
    ).toBe('29.92');
  });

  it('shows two decimals for inches of rain', () => {
    expect(
      formatUnitValue(12.7, { kind: 'precipitation', fromUnit: 'mm', unitMode: 'imperial' })
    ).toBe('0.5');
    expect(
      formatUnitValue(13, { kind: 'precipitation', fromUnit: 'mm', unitMode: 'imperial' })
    ).toBe('0.51');
  });

  it('honours explicit decimals, clamped to the supported range', () => {
    const options = { kind: 'temperature', fromUnit: '°C', unitMode: 'metric' } as const;
    expect(formatUnitValue(21.456, { ...options, decimals: 2 })).toBe('21.46');
    expect(formatUnitValue(21.456, { ...options, decimals: 0 })).toBe('21');
    expect(formatUnitValue(1.123456789, { ...options, decimals: 99 })).toBe('1.123457');
    expect(formatUnitValue(21.456, { ...options, decimals: 1.5 })).toBe('21.5');
  });

  it('keeps zeros that belong to the integer part', () => {
    expect(formatUnitValue(100, {})).toBe('100');
    expect(formatUnitValue(1000, { kind: 'pressure', fromUnit: 'hPa', unitMode: 'metric' })).toBe(
      '1000'
    );
    expect(formatUnitValue(10.5, {})).toBe('10.5');
  });

  it('does not show a negative zero', () => {
    expect(formatUnitValue(-0.04, { kind: 'temperature', unitMode: 'metric' })).toBe('0');
    expect(formatUnitValue(-0.4, { decimals: 0 })).toBe('0');
    expect(formatUnitValue(-0.5, { kind: 'temperature', unitMode: 'metric' })).toBe('-0.5');
  });

  it('formats a value without a kind and without conversion', () => {
    expect(formatUnitValue('12.34')).toBe('12.3');
  });

  it.each([null, undefined, '', 'unavailable'])('shows the fallback for %j', (value) => {
    expect(formatUnitValue(value, { kind: 'temperature', unitMode: 'metric' })).toBe('--');
    expect(formatUnitValue(value, { kind: 'wind', unitMode: 'imperial', fallback: 'n/a' })).toBe(
      'n/a'
    );
  });
});

describe('formatKindValueForDisplay', () => {
  it('joins a degree unit without a space and others with one', () => {
    expect(
      formatKindValueForDisplay(68, { kind: 'temperature', fromUnit: '°F', unitMode: 'metric' })
        .text
    ).toBe('20°C');
    expect(
      formatKindValueForDisplay(10, { kind: 'wind', fromUnit: 'm/s', unitMode: 'metric' }).text
    ).toBe('36 km/h');
  });

  it('does not put a unit behind the fallback', () => {
    expect(
      formatKindValueForDisplay(null, { kind: 'temperature', unitMode: 'metric' })
    ).toStrictEqual({ value: '--', unit: '°C', text: '--' });
  });

  it('can leave the unit out of the text', () => {
    expect(
      formatKindValueForDisplay(5, { kind: 'length', unitMode: 'imperial', includeUnit: false })
        .text
    ).toBe('0');
  });
});
