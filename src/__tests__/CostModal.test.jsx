import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../contexts', () => ({
  useHomeAssistantMeta: () => ({ haConfig: { currency: 'kr' } }),
}));

vi.mock('../components/charts/SensorHistoryGraph', () => ({
  default: ({ data }) => <div data-testid="graph">{JSON.stringify(data.map((p) => p.value))}</div>,
}));

vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }) => (open ? <div>{children('title')}</div> : null),
  useModalShell: () => null,
}));

vi.mock('../services/haClient', async () => ({
  ...(await vi.importActual('../services/haClient')),
  getHistory: vi.fn(async () => []),
  getStatistics: vi.fn(async () => []),
}));

import CostModal from '../modals/CostModal';
import { getHistory } from '../services/haClient';

const conn = {};
const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
const rows = (...pairs) => pairs.map(([hours, s]) => ({ s, last_changed: hoursAgo(hours) }));
const entitiesWith = (state) => ({
  'sensor.cost': { entity_id: 'sensor.cost', state, attributes: {} },
});
const props = (state = '5') => ({
  show: true,
  onClose: vi.fn(),
  conn,
  entities: entitiesWith(state),
  todayEntityId: 'sensor.cost',
  t: (key) => key,
});
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('CostModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHistory.mockImplementation(async () => []);
  });

  it('keeps the chart on screen while a sensor update refreshes it', async () => {
    getHistory.mockResolvedValueOnce(rows([6, '1'], [3, '2'], [1, '3']));
    const { rerender } = render(<CostModal {...props('3')} />);
    await waitFor(() => expect(screen.getByTestId('graph')).toBeInTheDocument());

    const pending = deferred();
    getHistory.mockReturnValueOnce(pending.promise);
    await act(async () => rerender(<CostModal {...props('4')} />));

    expect(getHistory).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('common.loading')).toBeNull();
    expect(screen.getByTestId('graph')).toBeInTheDocument();

    await act(async () => pending.resolve(rows([6, '1'], [3, '2'], [1, '3'], [0.5, '4'])));
    await waitFor(() => expect(screen.getByTestId('graph').textContent).toContain('4'));
  });

  it('keeps the chart when a silent refresh fails', async () => {
    getHistory.mockResolvedValueOnce(rows([6, '1'], [1, '3']));
    const { rerender } = render(<CostModal {...props('3')} />);
    await waitFor(() => expect(screen.getByTestId('graph')).toBeInTheDocument());

    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    getHistory.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      rerender(<CostModal {...props('4')} />);
      await Promise.resolve();
    });
    expect(screen.getByTestId('graph')).toBeInTheDocument();
    expect(screen.queryByText('cost.noData')).toBeNull();
  });

  it('ignores a response that arrives after a newer one', async () => {
    const slow = deferred();
    getHistory.mockReturnValueOnce(slow.promise);
    const { rerender } = render(<CostModal {...props('3')} />);

    getHistory.mockResolvedValueOnce(rows([6, '7'], [1, '8']));
    await act(async () => rerender(<CostModal {...props('4')} />));
    await waitFor(() => expect(screen.getByTestId('graph').textContent).toContain('8'));

    await act(async () => slow.resolve(rows([6, '91'], [1, '92'])));
    expect(screen.getByTestId('graph').textContent).toContain('8');
    expect(screen.getByTestId('graph').textContent).not.toContain('92');
  });

  it('draws no negative bar for the daily reset', async () => {
    getHistory.mockImplementation(async () => rows([6, '20'], [4, '30'], [2, '2'], [1, '5']));
    const { container } = render(<CostModal {...props('5')} />);
    await waitFor(() => expect(screen.getByTestId('graph')).toBeInTheDocument());

    fireEvent.click(screen.getByText('cost.metric.delta'));
    await waitFor(() => expect(container.querySelectorAll('rect').length).toBeGreaterThan(0));
    expect(container.querySelectorAll('rect[fill*="status-error"]').length).toBe(0);
    expect(container).not.toHaveTextContent('-');
  });
});
