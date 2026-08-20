import { describe, expect, it } from 'vitest';
import { resolveClimateFavoriteModes, toggleClimateFavoriteMode } from '../utils/climateFavorites';

describe('climate mode favorites', () => {
  const availableModes = ['off', 'heat', 'cool', 'dry'];

  it('uses off and heat as the default shortcuts when both are supported', () => {
    expect(resolveClimateFavoriteModes(undefined, availableModes)).toEqual(['off', 'heat']);
  });

  it('keeps only two unique modes supported by the entity', () => {
    expect(
      resolveClimateFavoriteModes(['cool', 'unknown', 'dry', 'heat', 'cool'], availableModes)
    ).toEqual(['cool', 'dry']);
  });

  it('allows removing a default and selecting another mode', () => {
    const withoutHeat = toggleClimateFavoriteMode(undefined, 'heat', availableModes);
    expect(withoutHeat).toEqual(['off']);
    expect(toggleClimateFavoriteMode(withoutHeat, 'cool', availableModes)).toEqual(['off', 'cool']);
  });
});
