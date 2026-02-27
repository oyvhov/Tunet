/**
 * Prepare Nordpool price data for the NordpoolModal.
 * Returns { fullPriceData, currentPriceIndex, priceStats, name } or null if entity missing.
 */
export function prepareNordpoolData(
  cardId,
  { getCardSettingsKey, cardSettings, entities, customNames }
) {
  const settingsKey = getCardSettingsKey(cardId);
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const entity = entities[settings.nordpoolId];
  if (!entity) return null;

  const todayPrices = Array.isArray(entity.attributes?.today) ? entity.attributes.today : [];
  const tomorrowPrices = Array.isArray(entity.attributes?.tomorrow)
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

  const fullPriceData = allPrices.map((price, idx) => {
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

  const numericalPrices = allPrices.filter((p) => typeof p === 'number' && !Number.isNaN(p));
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
