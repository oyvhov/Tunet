import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BatteryPage from '../components/pages/BatteryPage';
import en from '../i18n/en.json';

vi.mock('../services/haClient', () => ({
  getAreas: vi.fn(() => new Promise(() => {})),
}));

const t = (key) => en[key] ?? key;

const battery = (entity_id, friendly_name, state, attributes = {}) => ({
  entity_id,
  state,
  attributes: { friendly_name, device_class: 'battery', ...attributes },
});

const toEntities = (list) => Object.fromEntries(list.map((e) => [e.entity_id, e]));

const renderPage = (list) =>
  render(
    <BatteryPage entities={toEntities(list)} conn={{}} pageSettings={{}} pageId="batteries" t={t} />
  );

const tileText = (name) => screen.getByText(name).closest('.group').textContent;

describe('BatteryPage binary sensors', () => {
  it('shows on as Low without a percentage', () => {
    renderPage([battery('binary_sensor.remote', 'Remote', 'on')]);

    expect(tileText('Remote')).toContain(en['battery.low']);
    expect(tileText('Remote')).not.toContain('%');
  });

  it('shows off as OK without a percentage', () => {
    renderPage([battery('binary_sensor.remote', 'Remote', 'off')]);

    expect(tileText('Remote')).toContain(en['battery.ok']);
    expect(tileText('Remote')).not.toContain('%');
  });

  it('counts them as low or OK and not as offline', () => {
    renderPage([
      battery('binary_sensor.remote', 'Remote', 'on'),
      battery('binary_sensor.door', 'Door', 'off'),
    ]);

    expect(screen.getByRole('button', { name: `${en['battery.filter.low']} (1)` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `${en['battery.filter.ok']} (1)` })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Unavailable/ })).toBeNull();
    expect(screen.queryByText(new RegExp(en['battery.offline'], 'i'))).toBeNull();
  });

  it('still shows an unavailable binary sensor as offline', () => {
    renderPage([battery('binary_sensor.remote', 'Remote', 'unavailable')]);

    expect(tileText('Remote')).toContain(en['status.unavailable']);
  });

  it('sorts low binary sensors with the lowest and OK ones with the fullest', () => {
    renderPage([
      battery('sensor.half', 'Half', '50'),
      battery('binary_sensor.fine', 'Fine', 'off'),
      battery('binary_sensor.flat', 'Flat', 'on'),
    ]);

    const order = screen.getAllByText(/^(Half|Fine|Flat)$/).map((node) => node.textContent);
    expect(order).toEqual(['Flat', 'Half', 'Fine']);
  });
});

describe('BatteryPage filtering', () => {
  it('leaves out hidden and config entities but keeps diagnostic batteries', () => {
    renderPage([
      battery('sensor.diagnostic', 'Diagnostic', '80', { entity_category: 'diagnostic' }),
      battery('sensor.hidden', 'Hidden', '80', { hidden_by: 'user' }),
      battery('number.threshold', 'Threshold', '20', { entity_category: 'config' }),
    ]);

    expect(screen.getByText('Diagnostic')).toBeTruthy();
    expect(screen.queryByText('Hidden')).toBeNull();
    expect(screen.queryByText('Threshold')).toBeNull();
  });

  it('keeps percentages for ordinary sensors', () => {
    renderPage([battery('sensor.phone', 'Phone', '15')]);

    expect(tileText('Phone')).toContain('15%');
    fireEvent.click(screen.getByRole('button', { name: `${en['battery.filter.low']} (1)` }));
    expect(screen.getByText('Phone')).toBeTruthy();
  });
});
