import { describe, expect, it } from 'vitest';
import {
  buildRegistryLookupMap,
  enrichEntitiesWithRegistryMetadata,
} from '../utils/entityRegistryMetadata';

describe('entityRegistryMetadata', () => {
  it('reuses enriched entities while an unrelated entity changes', () => {
    const sensor = { entity_id: 'sensor.temperature', state: '21', attributes: {} };
    const entities = {
      'sensor.temperature': sensor,
      'light.kitchen': { entity_id: 'light.kitchen', state: 'off', attributes: {} },
    };
    const registry = buildRegistryLookupMap(
      [{ entity_id: 'sensor.temperature', platform: 'mqtt', device_id: 'thermometer' }],
      'entity_id'
    );
    const devices = buildRegistryLookupMap(
      [{ id: 'thermometer', name: 'Kitchen', area_id: 'kitchen' }],
      'id'
    );
    const first = enrichEntitiesWithRegistryMetadata(entities, registry, devices);
    const updated = {
      ...entities,
      'light.kitchen': { ...entities['light.kitchen'], state: 'on' },
    };
    const second = enrichEntitiesWithRegistryMetadata(updated, registry, devices);

    expect(second['sensor.temperature']).toBe(first['sensor.temperature']);
    expect(second['light.kitchen']).toBe(updated['light.kitchen']);
    expect(sensor.attributes).toEqual({});

    const changed = { ...sensor, state: '22' };
    const third = enrichEntitiesWithRegistryMetadata(
      { ...updated, 'sensor.temperature': changed },
      registry,
      devices
    );
    expect(third['sensor.temperature']).not.toBe(first['sensor.temperature']);
    expect(third['sensor.temperature'].state).toBe('22');
  });

  it('refreshes cached metadata when registry data changes or is removed', () => {
    const entities = {
      'sensor.temperature': { entity_id: 'sensor.temperature', state: '21', attributes: {} },
    };
    const registry = buildRegistryLookupMap(
      [{ entity_id: 'sensor.temperature', platform: 'mqtt', device_id: 'thermometer' }],
      'entity_id'
    );
    const devices = buildRegistryLookupMap([{ id: 'thermometer', name: 'Kitchen' }], 'id');
    const first = enrichEntitiesWithRegistryMetadata(entities, registry, devices);
    devices.set('thermometer', { id: 'thermometer', name: 'Bedroom' });
    const renamed = enrichEntitiesWithRegistryMetadata(entities, registry, devices);
    expect(renamed['sensor.temperature']).not.toBe(first['sensor.temperature']);
    expect(renamed['sensor.temperature'].attributes.device_name).toBe('Bedroom');

    devices.delete('thermometer');
    const removed = enrichEntitiesWithRegistryMetadata(entities, registry, devices);
    expect(removed['sensor.temperature'].attributes.device_name).toBeUndefined();
    expect(removed['sensor.temperature'].attributes.platform).toBe('mqtt');

    expect(enrichEntitiesWithRegistryMetadata(entities)).toBe(entities);
  });

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
