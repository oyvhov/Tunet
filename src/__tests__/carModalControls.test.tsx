import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import LeafModal from '../modals/LeafModal';

vi.mock('../contexts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useConfig: () => ({ unitsMode: 'metric', language: 'en' }),
  useHomeAssistantMeta: () => ({
    haConfig: { unit_system: { temperature: '°C', length: 'km' } },
  }),
}));

type Spec = Record<string, [string, Record<string, unknown>?]>;

const t = (key: string) => key;

function renderCar(spec: Spec, car: Record<string, unknown>) {
  const entities = Object.fromEntries(
    Object.entries(spec).map(([id, [state, attributes = {}]]) => [
      id,
      { entity_id: id, state, attributes, last_changed: '', last_updated: '' },
    ])
  );
  const callService = vi.fn(async () => ({}));
  const props = {
    show: true,
    onClose: () => {},
    entities,
    callService,
    getS: (id: string, fallback = '--') => {
      const state = entities[id]?.state;
      return !state || state === 'unavailable' || state === 'unknown' ? fallback : state;
    },
    getA: (id: string, attr: string, fallback: unknown = null) =>
      entities[id]?.attributes?.[attr] ?? fallback,
    t,
    car,
  } as unknown as ComponentProps<typeof LeafModal>;
  render(<LeafModal {...props} />);
  return { callService };
}

const control = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;

describe('car popup', () => {
  afterEach(cleanup);

  it('asks before unlocking', () => {
    const { callService } = renderCar({ 'lock.car': ['locked'] }, { lockId: 'lock.car' });
    fireEvent.click(control('car.unlock'));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(control('lock.action.confirmUnlock'));
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.car' });
  });

  it('locks on a single tap', () => {
    const { callService } = renderCar({ 'lock.car': ['unlocked'] }, { lockId: 'lock.car' });
    fireEvent.click(control('car.lock'));
    expect(callService).toHaveBeenCalledWith('lock', 'lock', { entity_id: 'lock.car' });
  });

  it('asks before starting the engine and stops it on a single tap', () => {
    const first = renderCar({ 'switch.ign': ['off'] }, { ignitionSwitchId: 'switch.ign' });
    fireEvent.click(control('car.engineStart'));
    expect(first.callService).not.toHaveBeenCalled();
    fireEvent.click(control('car.confirmEngineStart'));
    expect(first.callService).toHaveBeenCalledWith('switch', 'turn_on', {
      entity_id: 'switch.ign',
    });
    cleanup();

    const second = renderCar({ 'switch.ign': ['on'] }, { ignitionSwitchId: 'switch.ign' });
    fireEvent.click(control('car.engineStop'));
    expect(second.callService).toHaveBeenCalledWith('switch', 'turn_off', {
      entity_id: 'switch.ign',
    });
  });

  it('never labels an unavailable lock as Lock', () => {
    renderCar({ 'lock.car': ['unavailable'] }, { lockId: 'lock.car' });
    expect(screen.queryByText('car.lock')).toBeNull();
    expect(control('status.unavailable').disabled).toBe(true);
  });

  it('disables a control only when its own entity is unavailable', () => {
    renderCar(
      {
        'climate.car': ['unavailable', { temperature: 20 }],
        'switch.charge': ['unavailable', { friendly_name: 'Lad' }],
        'switch.ok': ['off', { friendly_name: 'Ok' }],
        'number.limit': ['unavailable', { min: 50, max: 100 }],
        'select.limit': ['unavailable', { options: ['80'] }],
        'switch.ign': ['unavailable'],
      },
      {
        climateId: 'climate.car',
        chargeControlIds: ['switch.charge', 'switch.ok'],
        chargeLimitNumberId: 'number.limit',
        chargeLimitSelectId: 'select.limit',
        ignitionSwitchId: 'switch.ign',
      }
    );
    expect(control('car.climate').disabled).toBe(true);
    expect(control('common.increase').disabled).toBe(true);
    expect(control('common.decrease').disabled).toBe(true);
    expect(control('Lad').disabled).toBe(true);
    expect(control('Ok').disabled).toBe(false);
    expect(control('car.engineStart').disabled).toBe(true);
    expect((document.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
    for (const slider of document.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
      expect(slider.disabled).toBe(true);
    }
  });

  it('keeps a never-pressed button usable', () => {
    renderCar({ 'button.update': ['unknown'] }, { updateButtonId: 'button.update' });
    expect(control('car.update').disabled).toBe(false);
  });

  it('keeps a select and a number at unknown usable', () => {
    renderCar(
      {
        'number.limit': ['unknown', { min: 50, max: 100 }],
        'select.limit': ['unknown', { options: ['80'] }],
      },
      { chargeLimitNumberId: 'number.limit', chargeLimitSelectId: 'select.limit' }
    );
    expect((document.querySelector('select') as HTMLSelectElement).disabled).toBe(false);
    for (const slider of document.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
      expect(slider.disabled).toBe(false);
    }
  });

  it('still disables stateful controls at unknown', () => {
    renderCar(
      { 'lock.car': ['unknown'], 'switch.ign': ['unknown'] },
      {
        lockId: 'lock.car',
        ignitionSwitchId: 'switch.ign',
      }
    );
    expect(control('common.unknown').disabled).toBe(true);
    expect(control('car.engineStart').disabled).toBe(true);
  });

  it('disables a button entity that is unavailable', () => {
    renderCar({ 'button.update': ['unavailable'] }, { updateButtonId: 'button.update' });
    expect(control('car.update').disabled).toBe(true);
  });

  it('asks for the code of a protected lock and sends it', () => {
    const { callService } = renderCar(
      { 'lock.car': ['locked', { code_format: '^\\d{4}$' }] },
      { lockId: 'lock.car' }
    );
    expect(control('car.unlock').disabled).toBe(true);
    expect(screen.getByLabelText('lock.code.prompt').getAttribute('inputmode')).toBe('numeric');
    fireEvent.change(screen.getByLabelText('lock.code.prompt'), { target: { value: '1234' } });
    fireEvent.click(control('car.unlock'));
    fireEvent.click(control('lock.action.confirmUnlock'));
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', {
      entity_id: 'lock.car',
      code: '1234',
    });
  });

  it('prints power and time with their units', () => {
    renderCar(
      {
        'sensor.power': ['7.42', { unit_of_measurement: 'kW', device_class: 'power' }],
        'sensor.full': ['45', { unit_of_measurement: 'min', device_class: 'duration' }],
        'sensor.rate': ['Normal'],
      },
      {
        chargingPowerId: 'sensor.power',
        timeToFullId: 'sensor.full',
        chargeRateId: 'sensor.rate',
      }
    );
    expect(screen.getByText('7.4 kW')).toBeTruthy();
    expect(screen.getByText('45 min')).toBeTruthy();
    expect(screen.getByText('Normal')).toBeTruthy();
  });

  it('formats the charge end time instead of printing the raw timestamp', () => {
    renderCar(
      { 'sensor.end': ['2026-11-09T06:10:00+00:00', { device_class: 'timestamp' }] },
      { chargeEndTimeId: 'sensor.end' }
    );
    expect(document.body).not.toHaveTextContent('2026-11-09T');
    expect(document.body).not.toHaveTextContent('2026 ');
    expect(document.body).toHaveTextContent('Nov');
  });

  it('shows no value for an unavailable charging power', () => {
    renderCar(
      { 'sensor.power': ['unavailable', { unit_of_measurement: 'kW' }] },
      { chargingPowerId: 'sensor.power' }
    );
    expect(document.body).not.toHaveTextContent('kW');
    expect(screen.getByText('--')).toBeTruthy();
  });

  it.each([
    ['on', 'car.pluggedIn'],
    ['plugged', 'car.pluggedIn'],
    ['true', 'car.pluggedIn'],
    ['off', 'car.unplugged'],
    ['unavailable', 'status.unavailable'],
  ])('reads the plug state %s as %s', (state, label) => {
    renderCar(
      { 'sensor.bat': ['80'], 'binary_sensor.plug': [state] },
      { batteryId: 'sensor.bat', pluggedId: 'binary_sensor.plug' }
    );
    expect(screen.getByText(label)).toBeTruthy();
  });
});
