export const DEFAULT_CLIMATE_FAVORITE_MODES = ['off', 'heat'];
export const MAX_CLIMATE_FAVORITE_MODES = 2;

export function resolveClimateFavoriteModes(
  configuredModes: unknown,
  availableModes: unknown
): string[] {
  if (!Array.isArray(availableModes)) return [];

  const available = new Set(
    availableModes.filter((mode): mode is string => typeof mode === 'string' && !!mode.trim())
  );
  const candidates: unknown[] = Array.isArray(configuredModes)
    ? configuredModes
    : DEFAULT_CLIMATE_FAVORITE_MODES;

  return Array.from(
    new Set(
      candidates.filter(
        (mode): mode is string => typeof mode === 'string' && !!mode.trim() && available.has(mode)
      )
    )
  ).slice(0, MAX_CLIMATE_FAVORITE_MODES);
}

export function toggleClimateFavoriteMode(
  configuredModes: unknown,
  mode: unknown,
  availableModes: readonly unknown[] | null | undefined
): string[] {
  if (typeof mode !== 'string' || !availableModes?.includes(mode)) {
    return resolveClimateFavoriteModes(configuredModes, availableModes);
  }

  const current = resolveClimateFavoriteModes(configuredModes, availableModes);
  if (current.includes(mode)) return current.filter((candidate) => candidate !== mode);
  if (current.length >= MAX_CLIMATE_FAVORITE_MODES) return current;
  return [...current, mode];
}
