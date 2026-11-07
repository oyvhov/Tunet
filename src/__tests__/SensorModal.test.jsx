import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    haConfig: {
      unit_system: {
        temperature: '°C',
      },
    },
  }),
}));

vi.mock('../components/charts/SensorHistoryGraph', () => ({
  default: () => <div data-testid="sensor-history-graph" />,
}));

vi.mock('../components/charts/BinaryTimeline', () => ({
  default: () => <div data-testid="binary-timeline" />,
}));

vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }) =>
    open ? <div data-testid="sensor-modal-shell">{children('sensor-modal-title')}</div> : null,
  useModalShell: () => null,
}));

vi.mock('../icons', () => ({
  X: () => <svg aria-hidden="true" />,
  getIconComponent: () => null,
}));

vi.mock('../services/haClient', async () => {
  const actual = await vi.importActual('../services/haClient');
  return {
    ...actual,
    getHistory: vi.fn(async () => []),
    getHistoryRest: vi.fn(async () => []),
    getStatistics: vi.fn(async () => []),
  };
});

import SensorModal from '../modals/SensorModal';
import { canUseHistoryRest, getHistory, getHistoryRest } from '../services/haClient';

const makeEntity = (overrides = {}) => ({
  entity_id: 'sensor.eilev_temperatur',
  state: '21.5',
  last_changed: '2026-04-14T12:30:00.000Z',
  last_updated: '2026-04-14T12:30:00.000Z',
  attributes: {
    friendly_name: 'Eilev Temperatur',
    unit_of_measurement: '°C',
  },
  ...overrides,
});

const baseProps = (overrides = {}) => ({
  isOpen: true,
  onClose: vi.fn(),
  entityId: 'sensor.eilev_temperatur',
  entity: makeEntity(),
  customName: null,
  conn: {},
  haUrl: 'http://192.168.10.103:8123',
  haToken: 'token-123',
  callService: vi.fn(),
  t: (key) => key,
  ...overrides,
});

describe('SensorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects when direct history REST is cross-origin', () => {
    expect(canUseHistoryRest('http://192.168.10.103:8123', 'http://192.168.10.150:3002')).toBe(
      false
    );
    expect(canUseHistoryRest('http://192.168.10.150:3002', 'http://192.168.10.150:3002')).toBe(
      true
    );
  });

  it('uses websocket history once for cross-origin HA urls across entity rerenders', async () => {
    const props = baseProps();
    const { rerender } = render(<SensorModal {...props} />);

    await waitFor(() => {
      expect(getHistory).toHaveBeenCalledTimes(1);
    });
    expect(getHistoryRest).not.toHaveBeenCalled();

    await act(async () => {
      rerender(
        <SensorModal
          {...props}
          entity={makeEntity({
            state: '22.0',
            last_updated: '2026-04-14T12:31:00.000Z',
          })}
        />
      );
      await Promise.resolve();
    });

    expect(getHistory).toHaveBeenCalledTimes(1);
    expect(getHistoryRest).not.toHaveBeenCalled();
  });
});
