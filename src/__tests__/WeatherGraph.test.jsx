import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WeatherGraph from '../components/charts/WeatherGraph';

describe('WeatherGraph', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps the graph unchanged when the same history is passed during other entity updates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
    const history = [
      { last_updated: '2026-10-23T09:00:00Z', state: 8 },
      { last_updated: '2026-10-23T11:00:00Z', state: 10 },
    ];
    const { container, rerender } = render(
      <WeatherGraph history={history} currentTemp={10.1} colorLimits={[0, 10, 20, 28]} />
    );
    const initial = container.querySelector('svg').innerHTML;

    vi.setSystemTime(new Date('2026-10-23T12:00:05Z'));
    rerender(
      <WeatherGraph
        history={history.map((point) => ({ ...point }))}
        currentTemp={10.1}
        colorLimits={[0, 10, 20, 28]}
      />
    );
    expect(container.querySelector('svg').innerHTML).toBe(initial);

    rerender(<WeatherGraph history={history} currentTemp={12} colorLimits={[0, 10, 20, 28]} />);
    expect(container.querySelector('svg').innerHTML).not.toBe(initial);
  });

  it('updates the graph when history or color thresholds change', () => {
    const now = Date.now();
    const history = [
      { last_updated: new Date(now - 3600_000).toISOString(), state: 8 },
      { last_updated: new Date(now - 60_000).toISOString(), state: 10 },
    ];
    const { container, rerender } = render(<WeatherGraph history={history} currentTemp={10} />);
    const initial = container.querySelector('svg').innerHTML;
    const changedHistory = [...history, { last_updated: new Date(now).toISOString(), state: 16 }];
    rerender(<WeatherGraph history={changedHistory} currentTemp={10} />);
    const changed = container.querySelector('svg').innerHTML;
    expect(changed).not.toBe(initial);

    rerender(
      <WeatherGraph history={changedHistory} currentTemp={10} colorLimits={[0, 8, 11, 15]} />
    );
    expect(container.querySelector('svg').innerHTML).not.toBe(changed);
  });
});
