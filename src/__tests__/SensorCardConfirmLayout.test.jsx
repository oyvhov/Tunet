import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SensorCard from '../components/cards/SensorCard';
import SensorCardSettings from '../modals/SensorCardSettings';
import en from '../i18n/en.json';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({ haConfig: { unit_system: { temperature: '°C' } } }),
}));
vi.mock('../components/ui/IconPicker', () => ({ default: () => <div /> }));

const pc = {
  entity_id: 'binary_sensor.desktop',
  state: 'on',
  attributes: { friendly_name: 'Desktop' },
};
const shutdown = {
  entity_id: 'script.desktop_power',
  state: 'off',
  attributes: { friendly_name: 'Desktop power' },
};
const lamp = {
  entity_id: 'switch.lamp',
  state: 'off',
  attributes: { friendly_name: 'Lamp' },
};
const entities = {
  [pc.entity_id]: pc,
  [shutdown.entity_id]: shutdown,
  [lamp.entity_id]: lamp,
};
const props = (overrides = {}) => ({
  entity: pc,
  entities,
  conn: { sendMessagePromise: vi.fn().mockResolvedValue({}) },
  settings: { size: 'large' },
  name: 'Desktop',
  t: (key) => key,
  onOpen: vi.fn(),
  ...overrides,
});
const powerAction = {
  type: 'service',
  service: 'script.desktop_power',
  entityId: 'binary_sensor.desktop',
  icon: 'mdi:power',
};

describe('SensorCard action confirmation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs a confirmed action only on the second tap', async () => {
    const p = props({
      settings: {
        size: 'large',
        sensorAction: { ...powerAction, label: 'Shut down', confirm: true },
      },
    });
    render(<SensorCard {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Shut down' }));
    expect(p.conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(screen.getAllByText('sensor.action.confirm').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'sensor.action.confirm' }));
    await waitFor(() =>
      expect(p.conn.sendMessagePromise).toHaveBeenCalledWith({
        type: 'call_service',
        domain: 'script',
        service: 'desktop_power',
        service_data: { entity_id: 'binary_sensor.desktop' },
      })
    );
    expect(p.conn.sendMessagePromise).toHaveBeenCalledTimes(1);
  });

  it('shows the custom confirmation text and disarms after the timeout', () => {
    vi.useFakeTimers();
    const p = props({
      settings: {
        size: 'large',
        sensorAction: {
          ...powerAction,
          label: 'Shut down',
          confirm: true,
          confirmLabel: 'Are you sure?',
        },
      },
    });
    render(<SensorCard {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Shut down' }));
    expect(screen.getByRole('button', { name: 'Are you sure?' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Shut down' }));
    expect(p.conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Are you sure?' })).toBeInTheDocument();
  });

  it('keeps the On and Off toggle buttons from confirming each other', async () => {
    const p = props({
      entity: lamp,
      settings: { size: 'large', sensorAction: { confirm: true } },
      name: 'Lamp',
    });
    render(<SensorCard {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.on' }));
    expect(p.conn.sendMessagePromise).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'common.on' }));
    await waitFor(() =>
      expect(p.conn.sendMessagePromise).toHaveBeenCalledWith({
        type: 'call_service',
        domain: 'switch',
        service: 'turn_on',
        service_data: { entity_id: 'switch.lamp' },
      })
    );
  });

  it('runs actions without confirmation immediately', async () => {
    const p = props({ settings: { size: 'large', sensorAction: { ...powerAction } } });
    render(<SensorCard {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'sensor.scene.activate' }));
    await waitFor(() => expect(p.conn.sendMessagePromise).toHaveBeenCalledTimes(1));
  });
});

describe('SensorCard centered layout', () => {
  it('renders the status, name and a round power button for an on target', () => {
    const { container } = render(
      <SensorCard
        {...props({
          settings: {
            size: 'large',
            sensorLayout: 'centered',
            sensorAction: { ...powerAction, label: 'Power' },
          },
        })}
      />
    );
    expect(container.querySelector('[data-sensor-layout="centered"]')).toBeInTheDocument();
    expect(screen.getByText('status.on')).toBeInTheDocument();
    expect(screen.getByText('Desktop')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Power' });
    expect(button.className).toContain('rounded-full');
    expect(button.className).toContain('--status-error-bg');
  });

  it('uses the success tone when the target is off and the warning tone while confirming', () => {
    const off = { ...pc, state: 'off' };
    render(
      <SensorCard
        {...props({
          entity: off,
          entities: { ...entities, [pc.entity_id]: off },
          settings: {
            size: 'large',
            sensorLayout: 'centered',
            sensorAction: { ...powerAction, label: 'Power', confirm: true },
          },
        })}
      />
    );
    const button = screen.getByRole('button', { name: 'Power' });
    expect(button.className).toContain('--status-success-bg');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'sensor.action.confirm' }).className).toContain(
      '--status-warning-bg'
    );
  });

  it('keeps the standard layout for small cards', () => {
    const { container } = render(
      <SensorCard
        {...props({
          settings: { size: 'small', sensorLayout: 'centered', sensorAction: powerAction },
        })}
      />
    );
    expect(container.querySelector('[data-sensor-layout="centered"]')).not.toBeInTheDocument();
  });
});

describe('SensorCardSettings confirmation and layout', () => {
  const t = (key) => en[key] || key;
  function Editor({ onSave }) {
    const [settings, setSettings] = useState({
      sensorAction: { type: 'script', entityId: 'script.desktop_power' },
    });
    return (
      <SensorCardSettings
        entityId="binary_sensor.desktop"
        settingsKey="entity_card_desktop"
        settings={settings}
        entities={entities}
        conn={null}
        connected
        saveCardSetting={(id, key, value) => {
          onSave(id, key, value);
          setSettings((previous) => ({ ...previous, [key]: value }));
        }}
        name="Desktop"
        iconName={null}
        onNameChange={vi.fn()}
        onIconChange={vi.fn()}
        t={t}
      />
    );
  }

  it('saves the layout and the confirmation options', () => {
    const save = vi.fn();
    render(<Editor onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Centered' }));
    expect(save).toHaveBeenCalledWith('entity_card_desktop', 'sensorLayout', 'centered');

    expect(screen.queryByLabelText('Confirmation text')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Ask for confirmation' }));
    expect(save).toHaveBeenLastCalledWith(
      'entity_card_desktop',
      'sensorAction',
      expect.objectContaining({ confirm: true })
    );
    fireEvent.change(screen.getByLabelText('Confirmation text'), {
      target: { value: 'Are you sure?' },
    });
    expect(save).toHaveBeenLastCalledWith(
      'entity_card_desktop',
      'sensorAction',
      expect.objectContaining({ confirm: true, confirmLabel: 'Are you sure?' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Standard' }));
    expect(save).toHaveBeenLastCalledWith('entity_card_desktop', 'sensorLayout', null);
  });
});
