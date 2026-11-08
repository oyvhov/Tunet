import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getStatusGroupStateLabel,
  getStatusGroupThreshold,
  resolveStatusGroupCandidates,
  resolveStatusGroupPill,
} from '../utils/statusGroupPills';

const t = (key) =>
  ({
    'statusPills.groupPresetLightsOn': 'Lights on',
    'statusPills.groupPresetLightsOnEmpty': 'No lights on',
    'statusPills.groupPresetOpeningsOpen': 'Open doors/windows',
    'statusPills.groupPresetCoversOpen': 'Open covers',
    'statusPills.groupPresetLowBattery': 'Low battery',
    'statusPills.groupPresetLowBatteryEmpty': 'No low batteries',
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
    'sensor.front_door_battery': {
      state: '15',
      attributes: { friendly_name: 'Front door battery', device_class: 'battery' },
    },
    'sensor.remote_battery': {
      state: '35',
      attributes: { friendly_name: 'Remote battery', device_class: 'battery' },
    },
    'sensor.offline_battery': {
      state: 'unavailable',
      attributes: { friendly_name: 'Offline battery', device_class: 'battery' },
    },
    'binary_sensor.smoke_alarm_battery': {
      state: 'on',
      attributes: { friendly_name: 'Smoke alarm battery', device_class: 'battery' },
    },
  };

  describe('getStatusGroupStateLabel', () => {
    const labels = {
      'binary.door.open': 'Door open',
      'binary.door.closed': 'Door closed',
      'binary.window.open': 'Window open',
      'binary.garageDoor.open': 'Garage open',
      'state.open': 'Open',
      'state.closed': 'Closed',
      'cover.open': 'Cover open',
      'common.on': 'ON',
    };
    const translate = (key) => labels[key] || key;
    const label = (id, state, deviceClass) =>
      getStatusGroupStateLabel(id, { state, attributes: { device_class: deviceClass } }, translate);

    it('names a door sensor state after its device class', () => {
      expect(label('binary_sensor.front', 'on', 'door')).toBe('Door open');
      expect(label('binary_sensor.front', 'off', 'door')).toBe('Door closed');
    });

    it('covers every opening device class the group preset accepts', () => {
      expect(label('binary_sensor.a', 'on', 'window')).toBe('Window open');
      expect(label('binary_sensor.a', 'on', 'garage_door')).toBe('Garage open');
      expect(label('binary_sensor.a', 'on', 'opening')).toBe('Open');
      expect(label('binary_sensor.a', 'off', 'opening')).toBe('Closed');
    });

    it('uses the wording of other binary sensor classes too', () => {
      expect(label('binary_sensor.hall', 'on', 'motion')).toBe('binary.motion.detected');
    });

    it('ignores device_class outside binary sensors', () => {
      expect(label('cover.blind', 'open', 'door')).toBe('Cover open');
    });

    it('falls back to the common state, then the raw state', () => {
      expect(label('binary_sensor.battery', 'on', 'battery')).toBe('ON');
      expect(label('sensor.battery', '15', 'battery')).toBe('15');
    });
  });

  describe('resolving cost', () => {
    afterEach(() => vi.restoreAllMocks());

    it('skips sorting for callers that only need the count', () => {
      const compare = vi.spyOn(String.prototype, 'localeCompare');

      const result = resolveStatusGroupPill({ groupPreset: 'lights_on' }, entities, t, {
        sortMatches: false,
      });

      expect(result.count).toBe(2);
      expect(compare).not.toHaveBeenCalled();
    });

    it('sorts the list by friendly name by default', () => {
      const unsorted = {
        'light.b': { state: 'on', attributes: { friendly_name: 'Zebra' } },
        'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
      };

      const result = resolveStatusGroupPill({ groupPreset: 'lights_on' }, unsorted, t);

      expect(result.matchedEntities.map(({ id }) => id)).toEqual(['light.a', 'light.b']);
    });

    it('reads the selected ids once per pill, not once per match', () => {
      const groupEntityIds = ['light.kitchen', 'light.porch'];
      const readIds = vi.spyOn(groupEntityIds, 'filter');

      const result = resolveStatusGroupPill(
        { groupPreset: 'lights_on', groupSelectionMode: 'include', groupEntityIds },
        entities,
        t
      );

      expect(result.count).toBe(2);
      expect(readIds).toHaveBeenCalledTimes(1);
    });
  });

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

  it('matches low batteries using the default threshold and binary low-battery sensors', () => {
    const result = resolveStatusGroupPill({ groupPreset: 'low_battery' }, entities, t);

    expect(getStatusGroupThreshold({ groupPreset: 'low_battery' })).toBe(20);
    expect(result.count).toBe(2);
    expect(result.matchedEntities.map(({ id }) => id)).toEqual([
      'sensor.front_door_battery',
      'binary_sensor.smoke_alarm_battery',
    ]);
    expect(result.syntheticEntity.attributes.friendly_name).toBe('Low battery');
  });

  it('uses a custom low-battery threshold and ignores unavailable batteries', () => {
    const pill = { groupPreset: 'low_battery', groupThreshold: 40 };
    const result = resolveStatusGroupPill(pill, entities, t);

    expect(getStatusGroupThreshold(pill)).toBe(40);
    expect(result.matchedEntities.map(({ id }) => id)).toEqual([
      'sensor.front_door_battery',
      'sensor.remote_battery',
      'binary_sensor.smoke_alarm_battery',
    ]);
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
