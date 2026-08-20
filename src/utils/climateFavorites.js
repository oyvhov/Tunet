export const DEFAULT_CLIMATE_FAVORITE_MODES = ['off', 'heat'];
export const MAX_CLIMATE_FAVORITE_MODES = 2;

export function resolveClimateFavoriteModes(configuredModes, availableModes) {
  if (!Array.isArray(availableModes)) return [];

  const available = new Set(
    availableModes.filter((mode) => typeof mode === 'string' && mode.trim())
  );
  const candidates = Array.isArray(configuredModes)
    ? configuredModes
    : DEFAULT_CLIMATE_FAVORITE_MODES;

  return Array.from(
    new Set(
      candidates.filter((mode) => typeof mode === 'string' && mode.trim() && available.has(mode))
    )
  ).slice(0, MAX_CLIMATE_FAVORITE_MODES);
}

export function toggleClimateFavoriteMode(configuredModes, mode, availableModes) {
  if (typeof mode !== 'string' || !availableModes?.includes(mode)) {
    return resolveClimateFavoriteModes(configuredModes, availableModes);
  }

  const current = resolveClimateFavoriteModes(configuredModes, availableModes);
  if (current.includes(mode)) return current.filter((candidate) => candidate !== mode);
  if (current.length >= MAX_CLIMATE_FAVORITE_MODES) return current;
  return [...current, mode];
}
