import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BinaryTimeline from '../components/charts/BinaryTimeline';
import { Bar, Donut, Gauge } from '../components/charts/SensorGauge';
import SensorHistoryGraph from '../components/charts/SensorHistoryGraph';
import SensorTrend from '../components/charts/SensorTrend';
import SparkLine from '../components/charts/SparkLine';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sensor chart geometry', () => {
  it('keeps sparkline points inside a shared horizontal safe inset', () => {
    const { container } = render(
      <SparkLine
        data={[{ value: 10 }, { value: 20 }, { value: 15 }]}
        currentIndex={2}
        height={60}
        ariaLabel="Temperature history"
      />
    );

    const wrapper = container.querySelector('[data-chart-safe-inset="12"]');
    const marker = container.querySelector('circle');

    expect(wrapper).not.toBeNull();
    expect(Number(marker.getAttribute('cx'))).toBeLessThanOrEqual(288);
    expect(screen.getByRole('img', { name: 'Temperature history' })).toBeInTheDocument();
  });

  it('keeps range visuals clean while retaining accessible labels', () => {
    const { container } = render(
      <>
        <Gauge value={48} min={0} max={100} ariaLabel="Humidity gauge" />
        <Bar value={48} min={0} max={100} height={2} ariaLabel="Humidity bar" />
        <Donut value={48} min={0} max={100} size={80} ariaLabel="Humidity donut" />
      </>
    );

    expect(
      screen.getByRole('img', { name: 'Humidity gauge' }).querySelectorAll('line')
    ).toHaveLength(0);
    const bar = screen.getByRole('img', { name: 'Humidity bar' });
    expect(bar.style.height).toBe('6px');
    expect(bar.querySelectorAll(':scope > div')).toHaveLength(1);
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    expect(screen.getByRole('img', { name: 'Humidity donut' })).toBeInTheDocument();
  });
});

describe('sensor gauges', () => {
  const visual = (name) => screen.getByRole('img', { name }).parentElement;

  it('draws arcs and rings in one gauge language', () => {
    render(
      <>
        <Gauge value={30} min={0} max={100} size={80} ariaLabel="Arc" />
        <Donut value={30} min={0} max={100} size={42} ariaLabel="Ring" />
      </>
    );
    const strokeRatio = (name, size) =>
      Number(visual(name).querySelector('[data-viz-value]').getAttribute('stroke-width')) / size;

    expect(strokeRatio('Arc', 80)).toBeCloseTo(strokeRatio('Ring', 42), 2);
    ['Arc', 'Ring'].forEach((name) => {
      const track = visual(name).querySelector('[data-viz-track]');
      expect(track).toHaveAttribute('stroke', 'var(--glass-bg)');
      expect(track).toHaveAttribute('stroke-linecap', 'round');
      expect(visual(name).querySelector('[data-viz-value]')).toHaveAttribute(
        'stroke-linecap',
        'round'
      );
      expect(visual(name).querySelector('[data-viz-ticks]')).not.toBeNull();
      expect(visual(name).querySelector('[data-viz-dot]')).not.toBeNull();
    });
  });

  it('puts the end dot at the value on both shapes', () => {
    render(
      <>
        <Gauge value={50} min={0} max={100} ariaLabel="Arc" />
        <Donut value={25} min={0} max={100} ariaLabel="Ring" />
      </>
    );
    const angle = (name) =>
      visual(name).querySelector('[data-viz-arm]').style.getPropertyValue('--viz-angle');

    expect(angle('Arc')).toBe('0deg');
    expect(angle('Ring')).toBe('90deg');
  });

  it('waits to draw in until the gauge is on screen', () => {
    let report;
    class Observer {
      constructor(callback) {
        report = callback;
      }

      observe() {}

      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', Observer);
    render(<Gauge value={40} min={0} max={100} ariaLabel="Arc" />);
    const wrapper = visual('Arc');

    expect(wrapper).not.toHaveAttribute('data-seen');
    act(() => report([{ isIntersecting: true }]));
    expect(wrapper).toHaveAttribute('data-seen');
    expect(wrapper).toHaveAttribute('data-in-view');
    act(() => report([{ isIntersecting: false }]));
    expect(wrapper).toHaveAttribute('data-seen');
    expect(wrapper).not.toHaveAttribute('data-in-view');
  });

  it('fills the bar from its value and marks segments on the track', () => {
    render(<Bar value={25} min={0} max={100} ariaLabel="Bar" />);
    const bar = screen.getByRole('img', { name: 'Bar' });

    expect(bar.className).toContain('rounded-full');
    expect(bar.className).toContain('sensor-viz-bar');
    expect(bar.style.getPropertyValue('--viz-pct')).toBe('0.25');
  });
});

describe('SensorTrend', () => {
  it('draws a curve with a fading area and an end dot at the latest value', () => {
    const { container } = render(
      <SensorTrend data={[{ value: 10 }, { value: 20 }, { value: 15 }]} ariaLabel="Power trend" />
    );

    expect(screen.getByRole('img', { name: 'Power trend' })).toBeInTheDocument();
    const line = container.querySelector('[data-trend-line]');
    expect(line.getAttribute('d')).toMatch(/^M /);
    expect(line).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    expect(container.querySelector('[data-trend-area]')).not.toBeNull();
    expect(container.querySelector('[data-trend-dot]').style.left).toBe('100%');
  });

  it('keeps the latest reading exact instead of smoothing it away', () => {
    const data = Array.from({ length: 60 }, (_, index) => ({ value: index === 59 ? 40 : 10 }));
    const { container } = render(<SensorTrend data={data} ariaLabel="Spike" />);

    expect(parseFloat(container.querySelector('[data-trend-dot]').style.top)).toBeLessThan(15);
  });

  it('draws nothing without data', () => {
    const { container } = render(<SensorTrend data={[]} ariaLabel="Empty" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SensorHistoryGraph', () => {
  it('uses stable gradient ids and adapts label density to the container', async () => {
    class ResizeObserverMock {
      constructor(callback) {
        this.callback = callback;
      }

      observe() {
        this.callback([{ contentRect: { width: 320 } }]);
      }

      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    const data = Array.from({ length: 60 }, (_, index) => ({
      value: index === 30 ? 100 : 20,
      time: new Date(2026, 0, 1, index, 0),
    }));
    const { container, rerender } = render(
      <SensorHistoryGraph data={data} height={220} ariaLabel="Pollen history" />
    );

    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-chart-label-count', '3');
    });
    const firstGradientId = container.querySelector('linearGradient').id;
    const linePath = [...container.querySelectorAll('path')].find(
      (path) => path.getAttribute('fill') === 'none'
    );
    expect(linePath.getAttribute('d')).not.toMatch(/,\s*-/);

    rerender(<SensorHistoryGraph data={data} height={220} ariaLabel="Pollen history" />);
    expect(container.querySelector('linearGradient').id).toBe(firstGradientId);

    expect(container.querySelector('circle')).toBeNull();
    expect(screen.queryByText(/^Min /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Avg /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Max /)).not.toBeInTheDocument();
  });
});

describe('BinaryTimeline', () => {
  it('keeps brief active events visible and exposes a textual summary', () => {
    const startTime = new Date('2026-07-25T10:00:00.000Z');
    const endTime = new Date('2026-07-25T11:00:00.000Z');
    render(
      <BinaryTimeline
        startTime={startTime}
        endTime={endTime}
        activeLabel="Aktiv"
        eventLabel="hendingar"
        events={[
          { state: 'off', time: startTime },
          { state: 'on', time: new Date('2026-07-25T10:10:00.000Z') },
          { state: 'off', time: new Date('2026-07-25T10:10:01.000Z') },
        ]}
      />
    );

    expect(screen.queryByText('Aktiv 0m')).not.toBeInTheDocument();
    expect(screen.queryByText('1 hendingar')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName('Aktiv: 0m. hendingar: 1.');
    expect(screen.getByTitle(/^on:/)).toHaveStyle({ minWidth: '4px' });
  });
});
