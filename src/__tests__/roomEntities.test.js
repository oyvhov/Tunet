import { describe, it, expect } from 'vitest';
import { getEffectiveRoomEntityIds, filterEntitiesByDomain } from '../utils';

describe('getEffectiveRoomEntityIds', () => {
  it('merges base and included lists and applies excludes', () => {
    const result = getEffectiveRoomEntityIds({
      entityIds: ['light.kitchen', 'sensor.kitchen_temp'],
      includedEntityIds: ['media_player.kitchen_tv', 'sensor.kitchen_temp'],
      excludedEntityIds: ['sensor.kitchen_temp'],
    });

    expect(result).toEqual(['light.kitchen', 'media_player.kitchen_tv']);
  });

  it('handles missing lists safely', () => {
    const result = getEffectiveRoomEntityIds({});
    expect(result).toEqual([]);
  });
});

describe('filterEntitiesByDomain', () => {
  it('filters by supported domain set', () => {
    const result = filterEntitiesByDomain(
      ['light.office', 'sensor.office_temp', 'media_player.office_tv'],
      ['light', 'media_player']
    );

    expect(result).toEqual(['light.office', 'media_player.office_tv']);
  });
});
