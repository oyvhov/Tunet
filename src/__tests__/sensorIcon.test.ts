import { describe, expect, it } from 'vitest';
import { Activity, Battery, Eye, Hash, Thermometer, Workflow } from '../icons';
import { resolveSensorIcon } from '../components/cards/sensorIcon';

describe('resolveSensorIcon', () => {
  it('uses the device class when Home Assistant gives no icon', () => {
    const battery = { attributes: { device_class: 'battery' } };
    const temperature = { attributes: { device_class: 'temperature' } };
    const motion = { attributes: { device_class: 'motion' } };
    expect(resolveSensorIcon('sensor.door_battery', null, battery)).toBe(Battery);
    expect(resolveSensorIcon('sensor.outside', null, temperature)).toBe(Thermometer);
    expect(resolveSensorIcon('binary_sensor.hall', null, motion)).toBe(Eye);
  });

  it('falls back to the domain icon', () => {
    expect(resolveSensorIcon('input_number.target')).toBe(Hash);
    expect(resolveSensorIcon('automation.gate')).toBe(Workflow);
    expect(resolveSensorIcon('sensor.other', null, { attributes: {} })).toBe(Activity);
  });

  it('lets a chosen icon win over the device class', () => {
    const entity = { attributes: { device_class: 'battery' } };
    expect(resolveSensorIcon('sensor.door_battery', 'Eye', entity)).toBe(Eye);
  });
});
