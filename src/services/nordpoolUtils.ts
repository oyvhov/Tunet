import type { HassEntities, HassEntity } from '../types/ha';

/** Long price series start 47 hours before today; shorter ones start at today's midnight. */
export function getCurrentPriceIndex(priceCount: number, currentHour: number): number {
  const indexWithHistory = currentHour + 47;
  return priceCount > 48 && indexWithHistory < priceCount ? indexWithHistory : currentHour;
}

// Norwegian electricity price support 2025/2026, on prices including VAT:
// 75 øre/kWh excl. VAT is 93.75 incl. VAT; the state pays 90% of what is above it.
const SUPPORT_THRESHOLD_ORE_INCL_VAT = 93.75;
const SUPPORT_SHARE = 0.9;
const SUBUNIT_PATTERN = /^(øre|ore|öre|cent|ct|snt|sent)/i;

/** How many øre one unit of this sensor is. A sensor without a unit is taken to be in øre. */
export function getNordpoolOrePerUnit(entity: HassEntity | null | undefined): number {
  if (entity?.attributes?.price_in_cents === true) return 1;
  const unit = String(entity?.attributes?.unit_of_measurement ?? '').trim();
  return !unit || SUBUNIT_PATTERN.test(unit) ? 1 : 100;
}

/** The hourly price after support, in the unit it came in. */
export function applyNordpoolSupport(price: number, orePerUnit: number): number {
  if (!Number.isFinite(price)) return price;
  const priceInOre = price * orePerUnit;
  if (priceInOre <= SUPPORT_THRESHOLD_ORE_INCL_VAT) return price;
  const support = (priceInOre - SUPPORT_THRESHOLD_ORE_INCL_VAT) * SUPPORT_SHARE;
  return price - support / orePerUnit;
}

/** Min, max and average of the prices that are numbers; all zero when there are none. */
export function getNordpoolPriceStats(prices: unknown[]): NordpoolPriceStats {
  const numbers = prices.filter((p): p is number => typeof p === 'number' && !Number.isNaN(p));
  if (numbers.length === 0) return { min: 0, max: 0, avg: 0 };
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
  };
}

export interface NordpoolPriceStats {
  min: number;
  max: number;
  avg: number;
}

export interface NordpoolCardSettings {
  nordpoolId?: string;
  [key: string]: unknown;
}

export interface NordpoolDataOptions {
  getCardSettingsKey: (cardId: string) => string;
  cardSettings: Record<string, NordpoolCardSettings | undefined>;
  entities: HassEntities;
  customNames?: Record<string, string> | null;
}

export interface NordpoolPricePoint {
  start: string;
  end: string;
  value: unknown;
}

export interface NordpoolData {
  entity: HassEntity;
  settings: NordpoolCardSettings;
  fullPriceData: NordpoolPricePoint[];
  currentPriceIndex: number;
  priceStats: NordpoolPriceStats;
  name: string;
}

/**
 * Prepare Nordpool price data for the NordpoolModal.
 * Returns { fullPriceData, currentPriceIndex, priceStats, name } or null if entity missing.
 */
export function prepareNordpoolData(
  cardId: string,
  { getCardSettingsKey, cardSettings, entities, customNames }: NordpoolDataOptions
): NordpoolData | null {
  const settingsKey = getCardSettingsKey(cardId);
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  // A missing nordpoolId looks up `undefined`, finds nothing and returns null below.
  const entity: HassEntity | undefined = entities[settings.nordpoolId as string];
  if (!entity) return null;

  const todayPrices: unknown[] = Array.isArray(entity.attributes?.today)
    ? entity.attributes.today
    : [];
  const tomorrowPrices: unknown[] = Array.isArray(entity.attributes?.tomorrow)
    ? entity.attributes.tomorrow
    : [];
  const tomorrowValid = entity.attributes?.tomorrow_valid === true;

  const allPrices = [
    ...todayPrices,
    ...(tomorrowValid && Array.isArray(tomorrowPrices) ? tomorrowPrices : []),
  ];

  const now = new Date();
  const currentHour = now.getHours();
  const currentPriceIndex = getCurrentPriceIndex(allPrices.length, currentHour);

  const fullPriceData = allPrices.map((price, idx): NordpoolPricePoint => {
    const actualHour = (idx - currentPriceIndex + currentHour) % 24;
    const dayOffset = Math.floor((idx - currentPriceIndex + currentHour) / 24);

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + dayOffset);
    startTime.setHours(actualHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    return {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      value: price,
    };
  });

  const priceStats = getNordpoolPriceStats(allPrices);

  const name = customNames?.[cardId] || entity.attributes?.friendly_name || cardId;

  return { entity, settings, fullPriceData, currentPriceIndex, priceStats, name };
}
