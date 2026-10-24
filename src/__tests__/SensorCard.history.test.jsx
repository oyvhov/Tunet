import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SensorCard from '../components/cards/SensorCard';

const { getHistory, getStatistics } = vi.hoisted(() => ({
  getHistory: vi.fn(),
  getStatistics: vi.fn(),
}));
vi.mock('../services/haClient', async (original) => ({
  ...(await original()),
  getHistory,
  getStatistics,
}));
vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({ haConfig: {} }),
}));
vi.mock('../components/charts/SparkLine', () => ({
  default: ({ data, variant }) => (
    <output data-variant={variant}>{JSON.stringify(data.map((point) => point.value))}</output>
  ),
}));

const entity = (id, state) => ({ entity_id: id, state, attributes: {} });
const props = {
  entity: entity('sensor.power', '100'),
  entities: {},
  conn: {},
  settings: { size: 'large', showGraph: true },
  t: (key) => key,
};
const tick = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(600);
  });

describe('sensor history responses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getHistory.mockReset();
    getStatistics.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it.each(['resolve', 'reject'])(
    'ignores a stale history %s after changing entity',
    async (outcome) => {
      let resolveOld;
      let rejectOld;
      getHistory.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            resolveOld = resolve;
            rejectOld = reject;
          })
      );
      getHistory.mockResolvedValueOnce([{ s: '200', lc: 1700000000 }]);
      const { rerender } = render(<SensorCard {...props} />);
      await tick();
      rerender(<SensorCard {...props} entity={entity('sensor.other', '200')} />);
      await tick();
      expect(screen.getByRole('status')).toHaveTextContent('[200,200]');
      await act(async () => {
        if (outcome === 'reject') rejectOld(new Error('Old request failed'));
        else resolveOld([{ s: '1', lc: 1700000000 }]);
      });
      expect(screen.getByRole('status')).toHaveTextContent('[200,200]');
      expect(getStatistics).not.toHaveBeenCalled();
    }
  );

  it('uses the latest state for the fallback without fetching history again', async () => {
    let finishHistory;
    getHistory.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishHistory = resolve;
        })
    );
    getStatistics.mockResolvedValue([]);
    const { rerender } = render(<SensorCard {...props} />);
    await tick();
    rerender(<SensorCard {...props} entity={entity('sensor.power', '105')} />);
    await act(async () => finishHistory([]));
    await tick();
    expect(getHistory).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('[105,105]');
  });

  it('reads long ranges from statistics and aggregates daily change bars', async () => {
    vi.setSystemTime(new Date(2026, 9, 24, 12, 0));
    const day = (offset) => new Date(2026, 9, 24 + offset, 0, 0).getTime();
    getStatistics.mockResolvedValue([
      { start: day(-1), state: 10, change: 4 },
      { start: day(-1) + 3600000, state: 12, change: 2 },
      { start: day(0), state: 15, change: 3 },
    ]);
    render(
      <SensorCard
        {...props}
        settings={{
          size: 'large',
          showGraph: true,
          graphRange: '7d',
          graphStyle: 'bar',
          graphStat: 'change',
        }}
      />
    );
    await tick();
    expect(getStatistics).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        period: 'hour',
        types: ['mean', 'min', 'max', 'state', 'change'],
      })
    );
    expect(getHistory).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveAttribute('data-variant', 'bar');
    expect(screen.getByRole('status')).toHaveTextContent('[6,3]');
  });

  it('keeps a single statistics row for a 30-day bar graph', async () => {
    vi.setSystemTime(new Date(2026, 9, 24, 12, 0));
    getStatistics.mockResolvedValue([
      { start: new Date(2026, 9, 24).getTime(), state: 12, change: 7.5 },
    ]);
    render(
      <SensorCard
        {...props}
        settings={{
          size: 'large',
          showGraph: true,
          graphRange: '30d',
          graphStyle: 'bar',
          graphStat: 'change',
        }}
      />
    );
    await tick();
    expect(getStatistics).toHaveBeenCalledWith({}, expect.objectContaining({ period: 'day' }));
    expect(screen.getByRole('status')).toHaveTextContent('[7.5]');
  });
});
