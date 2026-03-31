import { describe, expect, it } from 'vitest';
import {
  buildRegistryLookupMap,
  enrichEntitiesWithRegistryMetadata,
} from '../utils/entityRegistryMetadata';

describe('entityRegistryMetadata', () => {
  it('adds registry-backed platform and manufacturer data to entity attributes', () => {
    const entities = {
      'media_player.kjokken1': {
        entity_id: 'media_player.kjokken1',
        state: 'idle',
        attributes: {
          friendly_name: 'Kjokken 1',
        },
      },
    };

    const entityRegistryById = buildRegistryLookupMap(
      [
        {
          entity_id: 'media_player.kjokken1',
          platform: 'sonos',
          device_id: 'device-sonos-kitchen',
        },
      ],
      'entity_id'
    );
    const deviceRegistryById = buildRegistryLookupMap(
      [
        {
          id: 'device-sonos-kitchen',
          manufacturer: 'Sonos',
          model: 'One SL',
          name: 'Kjokken',
        },
      ],
      'id'
    );

    const result = enrichEntitiesWithRegistryMetadata(
      entities,
      entityRegistryById,
      deviceRegistryById
    );

    expect(result['media_player.kjokken1'].attributes.platform).toBe('sonos');
    expect(result['media_player.kjokken1'].attributes.integration).toBe('sonos');
    expect(result['media_player.kjokken1'].attributes.manufacturer).toBe('Sonos');
    expect(result['media_player.kjokken1'].attributes.model).toBe('One SL');
    expect(result['media_player.kjokken1'].attributes.device_name).toBe('Kjokken');
  });

  it('preserves existing entity attributes instead of overwriting them', () => {
    const entities = {
      'media_player.kjokken1': {
        entity_id: 'media_player.kjokken1',
        state: 'idle',
        attributes: {
          friendly_name: 'Kjokken 1',
          manufacturer: 'Custom Vendor',
        },
      },
    };

    const result = enrichEntitiesWithRegistryMetadata(
      entities,
      buildRegistryLookupMap(
        [
          {
            entity_id: 'media_player.kjokken1',
            platform: 'sonos',
            device_id: 'device-sonos-kitchen',
          },
        ],
        'entity_id'
      ),
      buildRegistryLookupMap(
        [
          {
            id: 'device-sonos-kitchen',
            manufacturer: 'Sonos',
          },
        ],
        'id'
      )
    );

    expect(result['media_player.kjokken1'].attributes.manufacturer).toBe('Custom Vendor');
    expect(result['media_player.kjokken1'].attributes.integration).toBe('sonos');
  });
});