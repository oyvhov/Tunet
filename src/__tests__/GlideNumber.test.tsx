import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GlideNumber from '../components/ui/GlideNumber';

let frames: FrameRequestCallback[] = [];
let clock = 0;

const runFrame = (elapsed: number) => {
  clock += elapsed;
  const queued = frames;
  frames = [];
  queued.forEach((callback) => callback(clock));
};

const oneDecimal = (value: number) => value.toFixed(1);

const Shown = ({
  value,
  format = oneDecimal,
}: {
  value: number | null;
  format?: typeof oneDecimal;
}) => (
  <span data-testid="value">
    <GlideNumber value={value} format={format} />
  </span>
);

describe('GlideNumber', () => {
  beforeEach(() => {
    frames = [];
    clock = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      frames = [];
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the first value straight away', () => {
    render(<Shown value={20} />);

    expect(screen.getByTestId('value')).toHaveTextContent('20.0');
    expect(frames).toHaveLength(0);
  });

  it('counts from the old value to the new one within 200 ms', () => {
    const { rerender } = render(<Shown value={20} />);
    rerender(<Shown value={30} />);

    expect(screen.getByTestId('value')).toHaveTextContent('20.0');
    act(() => runFrame(0));
    act(() => runFrame(100));
    const halfway = Number(screen.getByTestId('value').textContent);
    expect(halfway).toBeGreaterThan(20);
    expect(halfway).toBeLessThan(30);

    act(() => runFrame(100));
    expect(screen.getByTestId('value')).toHaveTextContent('30.0');
    expect(frames).toHaveLength(0);
  });

  it('keeps in-between values at the precision of the numbers it counts between', () => {
    const shown: number[] = [];
    const record = (value: number) => {
      shown.push(value);
      return String(value);
    };
    const { rerender } = render(<Shown value={20} format={record} />);
    rerender(<Shown value={25} format={record} />);
    for (let frame = 0; frame < 15; frame += 1) act(() => runFrame(16));

    expect(shown.every(Number.isInteger)).toBe(true);
    expect(shown.at(-1)).toBe(25);
  });

  it('carries on from where it is when the value changes mid-way', () => {
    const { rerender } = render(<Shown value={0} />);
    rerender(<Shown value={100} />);
    act(() => runFrame(0));
    act(() => runFrame(100));
    const midway = Number(screen.getByTestId('value').textContent);

    rerender(<Shown value={50} />);
    expect(Number(screen.getByTestId('value').textContent)).toBe(midway);
    act(() => runFrame(0));
    act(() => runFrame(200));
    expect(screen.getByTestId('value')).toHaveTextContent('50.0');
  });

  it('shows the new value at once when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { rerender } = render(<Shown value={20} />);
    rerender(<Shown value={30} />);

    expect(screen.getByTestId('value')).toHaveTextContent('30.0');
    expect(frames).toHaveLength(0);
  });

  it('shows the fallback when there is no number', () => {
    render(
      <span data-testid="value">
        <GlideNumber value={null} format={oneDecimal} fallback="--" />
      </span>
    );

    expect(screen.getByTestId('value')).toHaveTextContent('--');
  });
});
