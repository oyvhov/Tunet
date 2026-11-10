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

  it('draws the compact rows Home Assistant sends over the websocket', async () => {
    getHistory.mockResolvedValue([
      { s: '20', a: {}, lu: 1700000000 },
      { s: '21', lu: 1700000300 },
      { s: '25', lu: 1700000600 },
    ]);
    render(<SensorCard {...props} />);
    await tick();
    expect(screen.getByRole('status')).toHaveTextContent('[20,21,25]');
    expect(getStatistics).not.toHaveBeenCalled();
  });

  it('draws no graph when Home Assistant has no history for the sensor', async () => {
    getHistory.mockResolvedValue([]);
    getStatistics.mockResolvedValue([]);
    render(<SensorCard {...props} />);
    await tick();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('fetches the graph again every five minutes while the card is on screen', async () => {
    getHistory.mockResolvedValue([{ s: '20', lu: 1700000000 }]);
    render(<SensorCard {...props} />);
    await tick();
    expect(getHistory).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });
    await tick();
    expect(getHistory).toHaveBeenCalledTimes(2);
  });

  it('fetches the graph again when Home Assistant reconnects', async () => {
    const listeners = {};
    const conn = {
      addEventListener: (type, callback) => {
        listeners[type] = callback;
      },
      removeEventListener: vi.fn(),
    };
    getHistory.mockResolvedValue([{ s: '20', lu: 1700000000 }]);
    render(<SensorCard {...props} conn={conn} />);
    await tick();
    expect(getHistory).toHaveBeenCalledTimes(1);
    act(() => listeners.ready());
    await tick();
    expect(getHistory).toHaveBeenCalledTimes(2);
  });

  it('keeps the graph when a later fetch fails', async () => {
    getHistory.mockResolvedValueOnce([
      { s: '20', lu: 1700000000 },
      { s: '21', lu: 1700000300 },
    ]);
    getHistory.mockRejectedValueOnce(new Error('Connection lost'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<SensorCard {...props} />);
    await tick();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });
    await tick();
    expect(screen.getByRole('status')).toHaveTextContent('[20,21]');
    consoleError.mockRestore();
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

  it('loads the graph when any entry the observer reports is on screen', async () => {
    class TwoEntryObserver {
      constructor(callback) {
        this.callback = callback;
      }

      observe(target) {
        this.callback([
          { isIntersecting: false, target },
          { isIntersecting: true, target },
        ]);
      }

      unobserve() {}

      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', TwoEntryObserver);
    getHistory.mockResolvedValue([
      { s: '20', lu: 1700000000 },
      { s: '21', lu: 1700000300 },
    ]);
    render(<SensorCard {...props} />);
    await tick();
    expect(getHistory).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('[20,21]');
    vi.unstubAllGlobals();
  });

  it('draws a trend on a small card that ends at the live value', async () => {
    getHistory.mockResolvedValue([
      { s: '20', lu: 1700000000 },
      { s: '30', lu: 1700000300 },
    ]);
    const { container } = render(
      <SensorCard
        {...props}
        entity={entity('sensor.power', '25')}
        settings={{ size: 'small', sensorVariant: 'trend', graphRange: '6h' }}
      />
    );
    await tick();

    expect(getHistory).toHaveBeenCalledTimes(1);
    const [, request] = getHistory.mock.calls[0];
    expect(request.entityId).toBe('sensor.power');
    expect(request.end.getTime() - request.start.getTime()).toBe(6 * 60 * 60 * 1000);
    const trend = container.querySelector('[data-sensor-graph="trend"]');
    expect(trend).not.toBeNull();
    expect(trend.querySelector('svg[role="img"]')).not.toBeNull();
    const dot = trend.querySelector('[data-trend-dot]');
    expect(dot.style.left).toBe('100%');
    const top = parseFloat(dot.style.top);
    expect(top).toBeGreaterThan(20);
    expect(top).toBeLessThan(80);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the full-width history graph when a large card has the trend style', async () => {
    getHistory.mockResolvedValue([
      { s: '20', lu: 1700000000 },
      { s: '21', lu: 1700000300 },
    ]);
    const { container } = render(
      <SensorCard {...props} settings={{ size: 'large', sensorVariant: 'trend' }} />
    );
    await tick();
    expect(screen.getByRole('status')).toHaveTextContent('[20,21]');
    expect(container.querySelector('[data-sensor-graph="trend"]')).toBeNull();
  });
});
