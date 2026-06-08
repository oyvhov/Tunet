import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VacuumModal from '../modals/VacuumModal';

vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }) => (open ? <div>{children()}</div> : null),
}));

const t = (key) =>
  ({
    'common.close': 'Close',
    'status.statusLabel': 'Status',
    'vacuum.reset': 'Reset',
    'vacuum.confirmResetShort': 'Sure?',
    'vacuum.sensors': 'Sensors',
    'vacuum.start': 'Start',
    'vacuum.home': 'Home',
    'vacuum.charging': 'Charging',
    'vacuum.maintenance': 'Maintenance',
    'vacuum.controls': 'Controls',
    'vacuum.roomCleaning': 'Room cleaning',
    'vacuum.statsHistory': 'History',
  })[key] || key;

const entities = {
  'vacuum.roborock': {
    entity_id: 'vacuum.roborock',
    state: 'docked',
    attributes: {
      friendly_name: 'Roborock',
    },
  },
  'sensor.roborock_sensor_dirty_left': {
    entity_id: 'sensor.roborock_sensor_dirty_left',
    state: '12',
    attributes: {
      friendly_name: 'Roborock sensor dirty left',
      unit_of_measurement: '%',
    },
  },
  'button.roborock_reset_sensor_consumable': {
    entity_id: 'button.roborock_reset_sensor_consumable',
    state: 'unknown',
    attributes: {
      friendly_name: 'Roborock reset sensor consumable',
    },
  },
};

const baseProps = (overrides = {}) => ({
  show: true,
  onClose: vi.fn(),
  entities,
  callService: vi.fn(),
  getA: (entityId, attr, fallback) => {
    const value = entities[entityId]?.attributes?.[attr];
    return value == null ? fallback : value;
  },
  t,
  vacuumId: 'vacuum.roborock',
  vacuumSettings: {},
  conn: null,
  getEntityImageUrl: vi.fn(),
  ...overrides,
});

describe('VacuumModal', () => {
  it('presses the matched Home Assistant reset button for the sensors consumable', async () => {
    const callService = vi.fn();
    render(<VacuumModal {...baseProps({ callService })} />);

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sure?' }));

    await waitFor(() => {
      expect(callService).toHaveBeenCalledWith('button', 'press', {
        entity_id: 'button.roborock_reset_sensor_consumable',
      });
    });
  });
});
