import { describe, expect, it } from 'vitest';
import {
  isSensorEntityActive,
  resolveSensorCardActionCall,
  resolveSensorCardConfig,
  sensorActionExpectationMatches,
} from '../utils/sensorCardConfig';

const entity = (entityId, state = 'off', attributes = {}) => ({
  entity_id: entityId,
  state,
  attributes,
});
const climate = (state = 'off', attributes = {}) => entity('climate.room', state, attributes);

describe('resolveSensorCardConfig', () => {
  it.each([
    ['sensor.temperature', 'none'],
    ['binary_sensor.window', 'none'],
    ['input_number.level', 'none'],
    ['select.mode', 'none'],
    ['input_select.mode', 'none'],
    ['switch.socket', 'toggle'],
    ['input_boolean.enabled', 'toggle'],
    ['light.lamp', 'toggle'],
    ['automation.schedule', 'toggle'],
    ['climate.room', 'toggle'],
    ['scene.night', 'scene'],
    ['script.night', 'script'],
    ['button.start', 'press'],
    ['input_button.start', 'press'],
  ])('retains automatic defaults for %s', (entityId, type) => {
    const original = entity(entityId);
    const config = resolveSensorCardConfig({}, original);
    expect(config).toMatchObject({ statusMode: 'auto', showLegacyControls: true });
    expect(config).not.toHaveProperty('layout');
    expect(config.statusEntity).toBe(original);
    expect(config.action).toMatchObject({
      type,
      configuredType: 'auto',
      entityId,
      trigger: 'button',
    });
  });

  it('resolves display, status, and action targets independently without mutating settings', () => {
    const primary = entity('sensor.temperature', '21');
    const target = climate('cool', { hvac_modes: ['off', 'cool'] });
    const status = entity('light.lamp', 'on');
    const settings = Object.freeze({
      entityId: primary.entity_id,
      sensorLayout: 'compact',
      sensorStatusMode: 'attribute',
      sensorStatusEntityId: status.entity_id,
      sensorStatusAttribute: ' brightness ',
      sensorAction: Object.freeze({
        type: 'toggle',
        entityId: target.entity_id,
        labelOn: ' Stop ',
        labelOff: ' Start ',
        trigger: 'icon',
      }),
    });
    const config = resolveSensorCardConfig(settings, primary, {
      [target.entity_id]: target,
      [status.entity_id]: status,
    });
    expect(config).toMatchObject({
      entityId: primary.entity_id,
      statusMode: 'attribute',
      statusEntity: status,
      statusAttribute: 'brightness',
      showLegacyControls: false,
      action: { targetEntity: target, labelOn: 'Stop', labelOff: 'Start', trigger: 'icon' },
    });
    expect(settings.sensorStatusAttribute).toBe(' brightness ');
    expect(config).not.toHaveProperty('subtitle');
    expect(config).not.toHaveProperty('layout');
  });

  it('flags targets that cannot run the chosen action', () => {
    const sensor = entity('sensor.temperature', '21');
    const supported = (settings, entities = {}) =>
      resolveSensorCardConfig(settings, sensor, entities).action.targetSupported;
    expect(supported({})).toBe(true);
    expect(supported({ sensorAction: { type: 'toggle' } })).toBe(false);
    expect(
      supported(
        { sensorAction: { type: 'toggle', entityId: 'climate.room' } },
        { 'climate.room': climate() }
      )
    ).toBe(true);
    expect(
      supported(
        { sensorAction: { type: 'press', entityId: 'light.hall' } },
        { 'light.hall': entity('light.hall') }
      )
    ).toBe(false);
    expect(
      supported(
        { sensorAction: { type: 'scene', entityId: 'scene.night' } },
        { 'scene.night': entity('scene.night') }
      )
    ).toBe(true);
    expect(supported({ sensorAction: { type: 'more-info' } })).toBe(true);
  });

  it('keeps missing selected status entities missing instead of showing the primary entity', () => {
    const config = resolveSensorCardConfig(
      { sensorStatusMode: 'entity', sensorStatusEntityId: 'light.missing' },
      entity('sensor.temperature', '21')
    );
    expect(config.statusEntity).toBeUndefined();
  });

  it('preserves legacy status visibility and script text defaults', () => {
    const script = entity('script.night');
    expect(resolveSensorCardConfig({ showStatus: false }, script).statusMode).toBe('hidden');
    expect(resolveSensorCardConfig({ scriptStatusText: ' Ready ' }, script).statusText).toBe(
      'Ready'
    );
    expect(
      resolveSensorCardConfig({ sensorStatusMode: 'text', sensorStatusText: '' }, script).statusMode
    ).toBe('auto');
    expect(resolveSensorCardConfig({ sensorStatusMode: 'hidden' }, script).statusMode).toBe(
      'hidden'
    );
  });
});

describe('resolveSensorCardActionCall', () => {
  it('turns a toggle into an explicit desired state', () => {
    expect(
      resolveSensorCardActionCall(
        { type: 'toggle', entityId: 'switch.socket' },
        entity('switch.socket', 'on')
      )
    ).toMatchObject({
      domain: 'switch',
      service: 'turn_off',
      data: { entity_id: 'switch.socket' },
      expectation: { entityId: 'switch.socket', state: 'off', active: false },
    });
  });

  it('uses supported climate power methods and confirms any active HVAC mode', () => {
    const call = resolveSensorCardActionCall(
      { type: 'turn_on', entityId: 'climate.room' },
      climate('off', { supported_features: 256 })
    );
    expect(call.service).toBe('turn_on');
    expect(call.expectation).toEqual({ entityId: 'climate.room', active: true, state: null });
    expect(
      sensorActionExpectationMatches(call.expectation, { 'climate.room': climate('heat') })
    ).toBe(true);
    expect(
      sensorActionExpectationMatches(call.expectation, { 'climate.room': climate('unavailable') })
    ).toBe(false);
    expect(
      resolveSensorCardActionCall(
        { type: 'turn_off' },
        climate('cool', { supported_features: 128 })
      ).service
    ).toBe('turn_off');
  });

  it('falls back to supported HVAC modes when climate power features are absent', () => {
    const call = resolveSensorCardActionCall(
      { type: 'toggle' },
      climate('off', { hvac_modes: ['off', 'cool', 'auto'] })
    );
    expect(call).toMatchObject({
      service: 'set_hvac_mode',
      data: { hvac_mode: 'auto' },
      expectation: { state: 'auto' },
    });
    expect(
      resolveSensorCardActionCall(
        { type: 'turn_off' },
        climate('cool', { hvac_modes: ['off', 'cool'] })
      ).data.hvac_mode
    ).toBe('off');
    expect(
      resolveSensorCardActionCall(
        { type: 'turn_on' },
        climate('off', { hvac_modes: ['off', 'cool'] })
      ).data.hvac_mode
    ).toBe('cool');
  });

  it('rejects climate actions without a supported method or mode', () => {
    expect(() =>
      resolveSensorCardActionCall({ type: 'turn_off' }, climate('heat', { hvac_modes: ['heat'] }))
    ).toThrow('unsupported');
    expect(() =>
      resolveSensorCardActionCall({ type: 'turn_on' }, climate('off', { hvac_modes: ['off'] }))
    ).toThrow('unsupported');
  });

  it.each([
    ['scene.night', 'scene', 'turn_on'],
    ['script.night', 'script', 'turn_on'],
    ['button.start', 'press', 'press'],
    ['input_button.start', 'press', 'press'],
  ])('acknowledges %s without assuming a lasting on state', (entityId, type, service) => {
    expect(
      resolveSensorCardActionCall({ type, entityId }, entity(entityId, 'unknown'))
    ).toMatchObject({ service, expectation: null });
  });

  it('preserves advanced action data and targets without injecting an unrelated entity', () => {
    const data = Object.freeze({ target: { area_id: 'bedroom' }, brightness: 150 });
    const call = resolveSensorCardActionCall({
      type: 'service',
      service: 'light.turn_on',
      entityId: 'sensor.temperature',
      data,
    });
    expect(call).toEqual({
      domain: 'light',
      service: 'turn_on',
      data,
      expectation: null,
      type: 'service',
    });
    expect(
      resolveSensorCardActionCall({
        type: 'service',
        service: 'climate.set_hvac_mode',
        entityId: 'climate.room',
        data: { hvac_mode: 'cool' },
      }).data
    ).toEqual({ entity_id: 'climate.room', hvac_mode: 'cool' });
  });

  it('supports service actions that need no entity target', () => {
    const config = resolveSensorCardConfig(
      {
        sensorAction: {
          type: 'service',
          service: 'rest_command.notify',
          targetMode: 'none',
          data: { message: 'Hello' },
        },
      },
      entity('sensor.temperature', '21')
    );
    expect(config.action.entityId).toBe('');
    expect(resolveSensorCardActionCall(config.action)).toMatchObject({
      domain: 'rest_command',
      service: 'notify',
      data: { message: 'Hello' },
    });
    expect(
      resolveSensorCardActionCall({
        ...config.action,
        targetEntity: entity('sensor.temperature', '21'),
      }).data
    ).not.toHaveProperty('entity_id');
  });

  it('uses active media states for power actions and confirmation', () => {
    const active = entity('media_player.tv', 'playing');
    const call = resolveSensorCardActionCall({ type: 'toggle' }, active);
    expect(call.service).toBe('turn_off');
    expect(
      sensorActionExpectationMatches(call.expectation, {
        [active.entity_id]: entity(active.entity_id, 'standby'),
      })
    ).toBe(true);
    expect(isSensorEntityActive(entity(active.entity_id, 'paused'))).toBe(true);
  });

  it('validates unsupported targets and malformed advanced actions before calling HA', () => {
    expect(() =>
      resolveSensorCardActionCall({ type: 'toggle' }, entity('sensor.temperature', '21'))
    ).toThrow('unsupported');
    expect(() =>
      resolveSensorCardActionCall({ type: 'scene' }, entity('switch.socket', 'off'))
    ).toThrow('unsupported');
    expect(() =>
      resolveSensorCardActionCall({ type: 'toggle' }, entity('switch.socket', 'unknown'))
    ).toThrow('unavailable');
    expect(() =>
      resolveSensorCardActionCall({ type: 'scene' }, entity('scene.night', 'unavailable'))
    ).toThrow('unavailable');
    expect(() =>
      resolveSensorCardActionCall(
        { type: 'toggle', entityId: 'switch.missing' },
        entity('switch.socket')
      )
    ).toThrow('unavailable');
    expect(() => resolveSensorCardActionCall({ type: 'service', service: 'invalid' })).toThrow(
      'invalid_service'
    );
    expect(() =>
      resolveSensorCardActionCall({ type: 'service', service: 'light.turn_on', data: [] })
    ).toThrow('invalid_data');
  });

  it('distinguishes active climate modes from binary entity states', () => {
    expect(isSensorEntityActive(climate('cool'))).toBe(true);
    expect(isSensorEntityActive(climate('off'))).toBe(false);
    expect(isSensorEntityActive(climate('unknown'))).toBe(false);
    expect(isSensorEntityActive(entity('scene.night', '2026-09-29T12:00:00Z'))).toBe(false);
  });
});
