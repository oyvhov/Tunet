const normalizeUnit = (unit: unknown): string =>
  String(unit || '')
    .trim()
    .toLowerCase();

export type UnitKind = 'temperature' | 'wind' | 'pressure' | 'precipitation' | 'length';
export type UnitsMode = 'follow_ha' | 'metric' | 'imperial';
export type EffectiveUnitMode = 'metric' | 'imperial';
export type ConvertValueByKindOptions = {
  kind?: UnitKind | null;
  fromUnit?: string | null;
  unitMode?: UnitsMode | null;
};
export type FormatUnitValueOptions = ConvertValueByKindOptions & {
  fallback?: string;
  decimals?: number | null;
};
export type FormatKindValueForDisplayOptions = FormatUnitValueOptions & { includeUnit?: boolean };
type UnitsHaConfig =
  | {
      unit_system?: { temperature?: string | null; length?: string | null } | null;
      temperature_unit?: string | null;
      length_unit?: string | null;
    }
  | null
  | undefined;

const isImperialHaConfig = (haConfig: UnitsHaConfig): boolean => {
  const temp = normalizeUnit(haConfig?.unit_system?.temperature || haConfig?.temperature_unit);
  const length = normalizeUnit(haConfig?.unit_system?.length || haConfig?.length_unit);
  if (temp.includes('f')) return true;
  if (
    length === 'mi' ||
    length === 'mile' ||
    length === 'miles' ||
    length === 'ft' ||
    length === 'foot' ||
    length === 'feet'
  )
    return true;
  return false;
};

export const getEffectiveUnitMode = (
  unitsMode: UnitsMode | string | null | undefined,
  haConfig: UnitsHaConfig
): EffectiveUnitMode => {
  if (unitsMode === 'metric' || unitsMode === 'imperial') return unitsMode;
  return isImperialHaConfig(haConfig) ? 'imperial' : 'metric';
};

export const inferUnitKind = (deviceClass: unknown, unit: unknown): UnitKind | null => {
  const cls = String(deviceClass || '').toLowerCase();
  const u = normalizeUnit(unit);

  if (['temperature', 'apparent_temperature', 'dew_point'].includes(cls)) return 'temperature';
  if (['pressure', 'atmospheric_pressure'].includes(cls)) return 'pressure';
  if (['wind_speed'].includes(cls)) return 'wind';
  if (['precipitation', 'precipitation_intensity'].includes(cls)) return 'precipitation';

  if (u.includes('°c') || u.includes('°f')) return 'temperature';
  if (
    u === 'km/h' ||
    u === 'kmh' ||
    u === 'km/t' ||
    u === 'm/s' ||
    u === 'ms' ||
    u === 'mph' ||
    u === 'kn' ||
    u === 'kt' ||
    u === 'knot' ||
    u === 'knots'
  )
    return 'wind';
  if (
    u === 'hpa' ||
    u === 'mbar' ||
    u === 'bar' ||
    u === 'pa' ||
    u === 'kpa' ||
    u === 'inhg' ||
    u === 'psi'
  )
    return 'pressure';
  if (u === 'mm' || u === 'cm' || u === 'm' || u === 'in' || u === 'inch' || u === 'inches')
    return 'precipitation';
  if (
    u === 'km' ||
    u === 'kilometer' ||
    u === 'kilometers' ||
    u === 'mi' ||
    u === 'mile' ||
    u === 'miles' ||
    u === 'm' ||
    u === 'meter' ||
    u === 'meters' ||
    u === 'ft' ||
    u === 'foot' ||
    u === 'feet'
  )
    return 'length';

  return null;
};

export const getUnitModeFromUnit = (
  kind: UnitKind | null | undefined,
  unit: unknown
): EffectiveUnitMode => {
  const u = normalizeUnit(unit);
  if (kind === 'temperature') return u.includes('f') ? 'imperial' : 'metric';
  if (kind === 'wind') return u === 'mph' ? 'imperial' : 'metric';
  if (kind === 'pressure') return u === 'inhg' ? 'imperial' : 'metric';
  if (kind === 'precipitation')
    return u === 'in' || u === 'inch' || u === 'inches' ? 'imperial' : 'metric';
  if (kind === 'length')
    return u === 'mi' || u === 'mile' || u === 'miles' || u === 'ft' || u === 'foot' || u === 'feet'
      ? 'imperial'
      : 'metric';
  return 'metric';
};

export const getDisplayUnitForKind = (
  kind: UnitKind | null | undefined,
  unitMode: UnitsMode | null | undefined
): string => {
  if (kind === 'temperature') return unitMode === 'imperial' ? '°F' : '°C';
  if (kind === 'wind') return unitMode === 'imperial' ? 'mph' : 'km/h';
  if (kind === 'pressure') return unitMode === 'imperial' ? 'inHg' : 'hPa';
  if (kind === 'precipitation') return unitMode === 'imperial' ? 'in' : 'mm';
  if (kind === 'length') return unitMode === 'imperial' ? 'mi' : 'km';
  return '';
};

const toNumber = (value: unknown): number | null => {
  // parseFloat coerces non-string input itself; the cast only satisfies its string signature
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value as string);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeDecimalPlaces = (
  value: unknown,
  fallback: number | null = null
): number | null => {
  if (value === undefined || value === null || value === '') return fallback;

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) return fallback;

  return Math.max(0, Math.min(parsed, 6));
};

const toCelsius = (value: unknown, fromUnit: string | null | undefined): number | null => {
  const n = toNumber(value);
  if (n === null) return null;
  const u = normalizeUnit(fromUnit);
  if (u.includes('f')) return (n - 32) * (5 / 9);
  return n;
};

const fromCelsius = (
  value: number | null,
  unitMode: UnitsMode | null | undefined
): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  if (unitMode === 'imperial') return (value * 9) / 5 + 32;
  return value;
};

const toMetersPerSecond = (value: unknown, fromUnit: string | null | undefined): number | null => {
  const n = toNumber(value);
  if (n === null) return null;
  const u = normalizeUnit(fromUnit);
  if (u === 'km/h' || u === 'kmh' || u === 'km/t') return n / 3.6;
  if (u === 'mph') return n * 0.44704;
  if (u === 'kn' || u === 'kt' || u === 'knot' || u === 'knots') return n * 0.514444;
  return n;
};

const fromMetersPerSecond = (
  value: number | null,
  unitMode: UnitsMode | null | undefined
): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  if (unitMode === 'imperial') return value * 2.236936;
  return value * 3.6;
};

const toHpa = (value: unknown, fromUnit: string | null | undefined): number | null => {
  const n = toNumber(value);
  if (n === null) return null;
  const u = normalizeUnit(fromUnit);
  if (u === 'pa') return n / 100;
  if (u === 'kpa') return n * 10;
  if (u === 'bar') return n * 1000;
  if (u === 'inhg') return n * 33.8638866667;
  if (u === 'psi') return n * 68.9475729;
  return n;
};

const fromHpa = (value: number | null, unitMode: UnitsMode | null | undefined): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  if (unitMode === 'imperial') return value / 33.8638866667;
  return value;
};

const toMillimeters = (value: unknown, fromUnit: string | null | undefined): number | null => {
  const n = toNumber(value);
  if (n === null) return null;
  const u = normalizeUnit(fromUnit);
  if (u === 'cm') return n * 10;
  if (u === 'm') return n * 1000;
  if (u === 'in' || u === 'inch' || u === 'inches') return n * 25.4;
  return n;
};

const fromMillimeters = (
  value: number | null,
  unitMode: UnitsMode | null | undefined
): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  if (unitMode === 'imperial') return value / 25.4;
  return value;
};

const toMeters = (value: unknown, fromUnit: string | null | undefined): number | null => {
  const n = toNumber(value);
  if (n === null) return null;
  const u = normalizeUnit(fromUnit);
  if (u === 'km' || u === 'kilometer' || u === 'kilometers') return n * 1000;
  if (u === 'mi' || u === 'mile' || u === 'miles') return n * 1609.344;
  if (u === 'ft' || u === 'foot' || u === 'feet') return n * 0.3048;
  return n;
};

const fromMeters = (
  value: number | null,
  unitMode: UnitsMode | null | undefined
): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  if (unitMode === 'imperial') return value / 1609.344;
  return value / 1000;
};

export const convertValueByKind = (
  value: unknown,
  { kind, fromUnit, unitMode }: ConvertValueByKindOptions
): number | null => {
  if (unitMode !== 'metric' && unitMode !== 'imperial') return toNumber(value);

  if (kind === 'temperature') return fromCelsius(toCelsius(value, fromUnit), unitMode);
  if (kind === 'wind') return fromMetersPerSecond(toMetersPerSecond(value, fromUnit), unitMode);
  if (kind === 'pressure') return fromHpa(toHpa(value, fromUnit), unitMode);
  if (kind === 'precipitation') return fromMillimeters(toMillimeters(value, fromUnit), unitMode);
  if (kind === 'length') return fromMeters(toMeters(value, fromUnit), unitMode);
  return toNumber(value);
};

export const formatUnitValue = (
  value: unknown,
  {
    kind,
    fromUnit,
    unitMode,
    fallback = '--',
    decimals: decimalPlaces,
  }: FormatUnitValueOptions = {}
): string => {
  const converted = kind
    ? convertValueByKind(value, { kind, fromUnit, unitMode })
    : toNumber(value);
  if (converted === null || !Number.isFinite(converted)) return fallback;

  let decimals = normalizeDecimalPlaces(decimalPlaces);
  if (decimals === null) {
    decimals = 1;
    const displayUnit = kind ? getDisplayUnitForKind(kind, unitMode) : '';
    if (kind === 'pressure') decimals = displayUnit === 'inHg' ? 2 : 0;
    if (kind === 'precipitation') decimals = displayUnit === 'in' ? 2 : 1;
    if (kind === 'length') decimals = 1;
  }

  const rendered = converted
    .toFixed(decimals)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
  return rendered;
};

export const formatKindValueForDisplay = (
  value: unknown,
  {
    kind,
    fromUnit,
    unitMode,
    fallback = '--',
    includeUnit = true,
    decimals: decimalPlaces,
  }: FormatKindValueForDisplayOptions = {}
): { value: string; unit: string; text: string } => {
  const renderedValue = formatUnitValue(value, {
    kind,
    fromUnit,
    unitMode,
    fallback,
    decimals: decimalPlaces,
  });
  const unit = kind ? getDisplayUnitForKind(kind, unitMode) : '';

  if (!includeUnit || !unit || renderedValue === fallback) {
    return { value: renderedValue, unit, text: renderedValue };
  }

  const separator = unit.startsWith('°') ? '' : ' ';
  return {
    value: renderedValue,
    unit,
    text: `${renderedValue}${separator}${unit}`,
  };
};
