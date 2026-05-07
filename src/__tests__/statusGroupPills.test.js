import { describe, expect, it } from 'vitest';
import { resolveStatusGroupCandidates, resolveStatusGroupPill } from '../utils/statusGroupPills';

const t = (key) =>
  ({
    'statusPills.groupPresetLightsOn': 'Lights on',
    'statusPills.groupPresetLightsOnEmpty': 'No lights on',
    'statusPills.groupPresetOpeningsOpen': 'Open doors/windows',
    'statusPills.groupPresetCoversOpen': 'Open covers',
  })[key] || key;

describe('statusGroupPills', () => {
  const entities = {
    'light.kitchen': {
      state: 'on',
      attributes: { friendly_name: 'Kitchen' },
    },
    'light.hallway': {
      state: 'off',
      attributes: { friendly_name: 'Hallway' },
    },
    'light.porch': {
      state: 'on',
      attributes: { friendly_name: 'Porch' },
    },
    'binary_sensor.front_door': {
      state: 'on',
      attributes: { friendly_name: 'Front door', device_class: 'door' },
    },
    'binary_sensor.motion': {
      state: 'on',
      attributes: { friendly_name: 'Motion', device_class: 'motion' },
    },
    'cover.living_room': {
      state: 'open',
      attributes: { friendly_name: 'Living room blind' },
    },
    'cover.bedroom': {
      state: 'closed',
      attributes: { friendly_name: 'Bedroom blind' },
    },
  };

  it('matches only lights that are currently on', () => {
    const result = resolveStatusGroupPill({ groupPreset: 'lights_on' }, entities, t);

    expect(result.count).toBe(2);
    expect(result.matchedEntities.map(({ id }) => id)).toEqual(['light.kitchen', 'light.porch']);
    expect(result.syntheticEntity.attributes.friendly_name).toBe('Lights on');
  });

  it('limits group matches to selected entity ids in include mode', () => {
    const result = resolveStatusGroupPill(
      {
        groupPreset: 'lights_on',
        groupSelectionMode: 'include',
        groupEntityIds: ['light.porch'],
      },
      entities,
      t
    );

    expect(result.count).toBe(1);
    expect(result.matchedEntities.map(({ id }) => id)).toEqual(['light.porch']);
  });

  it('excludes selected entity ids in exclude mode', () => {
    const result = resolveStatusGroupPill(
      {
        groupPreset: 'lights_on',
        groupSelectionMode: 'exclude',
        groupEntityIds: ['light.kitchen'],
      },
      entities,
      t
    );

    expect(result.count).toBe(1);
    expect(result.matchedEntities.map(({ id }) => id)).toEqual(['light.porch']);
  });

  it('lists preset candidates even when they are currently inactive', () => {
    const candidates = resolveStatusGroupCandidates('lights_on', entities).map(({ id }) => id);

    expect(candidates).toEqual(['light.hallway', 'light.kitchen', 'light.porch']);
  });

  it('matches binary door/window opening sensors and ignores other binary sensors', () => {
    const result = resolveStatusGroupPill({ groupPreset: 'openings_open' }, entities, t);

    expect(result.count).toBe(1);
    expect(result.matchedEntities.map(({ id }) => id)).toEqual(['binary_sensor.front_door']);
  });

  it('matches covers that are not closed', () => {
    const result = resolveStatusGroupPill({ groupPreset: 'covers_open' }, entities, t);

    expect(result.count).toBe(1);
    expect(result.matchedEntities.map(({ id }) => id)).toEqual(['cover.living_room']);
  });

  it('hides empty groups by default and can be configured to stay visible', () => {
    const emptyEntities = { 'light.kitchen': { state: 'off', attributes: {} } };

    expect(
      resolveStatusGroupPill({ groupPreset: 'lights_on' }, emptyEntities, t).shouldRender
    ).toBe(false);
    expect(
      resolveStatusGroupPill({ groupPreset: 'lights_on', hideWhenEmpty: false }, emptyEntities, t)
        .shouldRender
    ).toBe(true);
  });
});
