import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({ haConfig: { unit_system: { temperature: '°C' } } }),
}));

vi.mock('../components/charts/SensorHistoryGraph', () => ({
  default: () => <div data-testid="sensor-history-graph" />,
}));

vi.mock('../components/charts/BinaryTimeline', () => ({
  default: ({ events }) => <div data-testid="binary-timeline">{events.length}</div>,
}));

vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }) => (open ? <div>{children('title')}</div> : null),
  useModalShell: () => null,
}));

vi.mock('../icons', () => ({
  X: () => <svg aria-hidden="true" />,
  getIconComponent: () => null,
}));

vi.mock('../services/haClient', async () => ({
  ...(await vi.importActual('../services/haClient')),
  getHistory: vi.fn(async () => []),
  getHistoryRest: vi.fn(async () => []),
  getStatistics: vi.fn(async () => []),
}));

import SensorModal from '../modals/SensorModal';
import { getHistory } from '../services/haClient';

const makeEntity = (entityId, state, attributes = {}) => ({
  entity_id: entityId,
  state,
  last_changed: '2026-04-14T12:30:00.000Z',
  last_updated: '2026-04-14T12:30:00.000Z',
  attributes: { friendly_name: 'Thing', ...attributes },
});

const open = async (entity, overrides = {}) => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    entityId: entity.entity_id,
    entity,
    conn: {},
    haUrl: 'http://192.168.10.103:8123',
    haToken: 'token',
    callService: vi.fn(async () => ({})),
    t: (key) => key,
    ...overrides,
  };
  await act(async () => {
    render(<SensorModal {...props} />);
    await Promise.resolve();
  });
  return props;
};

describe('SensorModal action', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['switch.pump', 'off', 'sensor.action.turnOn', 'switch', 'turn_on'],
    ['input_boolean.guest', 'on', 'sensor.action.turnOff', 'input_boolean', 'turn_off'],
    ['button.ping', 'unknown', 'sensor.action.press', 'button', 'press'],
    [
      'input_button.ping',
      '2026-04-14T12:30:00+00:00',
      'sensor.action.press',
      'input_button',
      'press',
    ],
    ['script.night', 'off', 'sensor.script.run', 'script', 'turn_on'],
    ['scene.movie', 'unknown', 'sensor.scene.activate', 'scene', 'turn_on'],
  ])('%s offers its action', async (entityId, state, label, domain, service) => {
    const props = await open(makeEntity(entityId, state));
    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() =>
      expect(props.callService).toHaveBeenCalledWith(domain, service, { entity_id: entityId })
    );
  });

  it.each([
    ['switch.pump', 'unavailable', 'sensor.action.turnOn'],
    ['switch.pump', 'unknown', 'sensor.action.turnOn'],
    ['scene.movie', 'unavailable', 'sensor.scene.activate'],
    ['button.ping', 'unavailable', 'sensor.action.press'],
  ])('%s is disabled while %s', async (entityId, state, label) => {
    const props = await open(makeEntity(entityId, state));
    const button = screen.getByRole('button', { name: label });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(props.callService).not.toHaveBeenCalled();
  });

  it('offers nothing for a plain sensor', async () => {
    await open(makeEntity('sensor.temp', '21', { unit_of_measurement: '°C' }));
    expect(screen.queryByRole('button', { name: /sensor\.(action|scene|script)/ })).toBeNull();
  });
});

describe('SensorModal history', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['unavailable', 'sensor.temp', 'unavailable'],
    ['unknown', 'sensor.temp', 'unknown'],
    ['text', 'sensor.status', 'Running'],
  ])('shows the state timeline for a %s sensor', async (_name, entityId, state) => {
    getHistory.mockResolvedValueOnce([
      { s: '21', lu: 1700000000 },
      { s: 'unavailable', lu: 1700000300 },
    ]);
    await open(makeEntity(entityId, state));
    await waitFor(() => expect(screen.getByTestId('binary-timeline')).toHaveTextContent('2'));
    expect(screen.getByText('history.log')).toBeInTheDocument();
  });

  it('says so when history cannot be loaded', async () => {
    getHistory.mockRejectedValueOnce(new Error('boom'));
    await open(makeEntity('sensor.temp', '21', { unit_of_measurement: '°C' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('sensorInfo.historyFailed')
    );
  });

  it('prints objects in attributes as readable text', async () => {
    await open(
      makeEntity('sensor.temp', '21', {
        forecast: { today: 3 },
        rooms: [{ name: 'a' }],
        modes: ['a', 'b'],
      })
    );
    expect(document.body).toHaveTextContent('{"today":3}');
    expect(document.body).toHaveTextContent('{"name":"a"}');
    expect(document.body).toHaveTextContent('a, b');
    expect(document.body).not.toHaveTextContent('[object Object]');
  });
});
