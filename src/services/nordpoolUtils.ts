import type { HassEntities, HassEntity } from '../types/ha';

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
  priceStats: { min: number; max: number; avg: number };
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
  const currentPriceIndex = currentHour + 47;

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

  const numericalPrices = allPrices.filter(
    (p): p is number => typeof p === 'number' && !Number.isNaN(p)
  );
  const priceStats =
    numericalPrices.length > 0
      ? {
          min: Math.min(...numericalPrices),
          max: Math.max(...numericalPrices),
          avg: numericalPrices.reduce((a, b) => a + b, 0) / numericalPrices.length,
        }
      : { min: 0, max: 0, avg: 0 };

  const name = customNames?.[cardId] || entity.attributes?.friendly_name || cardId;

  return { entity, settings, fullPriceData, currentPriceIndex, priceStats, name };
}
