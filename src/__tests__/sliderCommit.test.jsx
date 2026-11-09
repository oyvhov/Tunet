import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import M3Slider from '../components/ui/M3Slider';
import { useDebouncedCommit } from '../hooks/useDebouncedCommit';

describe('M3Slider onCommit', () => {
  const setup = () => {
    const onCommit = vi.fn();
    render(<M3Slider min={0} max={100} value={10} onChange={vi.fn()} onCommit={onCommit} />);
    return { onCommit, slider: screen.getByRole('slider') };
  };

  it('reports the final value once when the finger lifts', () => {
    const { onCommit, slider } = setup();
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '30' } });
    fireEvent.change(slider, { target: { value: '45' } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    fireEvent.touchEnd(slider);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(45);
  });

  it('reports nothing when the value never changed', () => {
    const { onCommit, slider } = setup();
    fireEvent.pointerDown(slider);
    fireEvent.pointerUp(slider);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('reports a change made with the arrow keys', () => {
    const { onCommit, slider } = setup();
    fireEvent.change(slider, { target: { value: '11' } });
    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    expect(onCommit).toHaveBeenCalledWith(11);
  });
});

describe('M3Slider touch area', () => {
  it.each([
    ['thin', 'h-4'],
    ['thinLg', 'h-6'],
  ])('gives %s a 44 px hit area and keeps its layout height', (variant, layoutHeight) => {
    render(<M3Slider min={0} max={100} value={10} onChange={vi.fn()} variant={variant} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveClass('h-11', 'top-1/2', '-translate-y-1/2');
    expect(slider).not.toHaveClass('h-full');
    expect(slider.parentElement).toHaveClass(layoutHeight);
  });

  it('leaves the other variants alone', () => {
    render(<M3Slider min={0} max={100} value={10} onChange={vi.fn()} variant="volume" />);
    expect(screen.getByRole('slider')).toHaveClass('h-full');
  });
});

describe('useDebouncedCommit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sends only the last value after the pause', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDebouncedCommit(commit, 300));
    act(() => {
      result.current(1);
      result.current(2);
    });
    expect(commit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(2);
  });

  it('sends a waiting value when the component goes away', () => {
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCommit(commit, 300));
    act(() => result.current(7));
    unmount();
    expect(commit).toHaveBeenCalledWith(7);
  });

  it('uses the latest callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useDebouncedCommit(fn, 300), {
      initialProps: { fn: first },
    });
    act(() => result.current(1));
    rerender({ fn: second });
    act(() => vi.advanceTimersByTime(300));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(1);
  });
});
