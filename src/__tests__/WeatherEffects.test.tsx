import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WeatherEffects from '../components/effects/WeatherEffects';

vi.mock('../hooks/useLowPowerMotion', () => ({ useLowPowerMotion: () => true }));

type Report = (entries: Array<{ isIntersecting: boolean }>) => void;

describe('WeatherEffects', () => {
  let report: Report;
  let getContext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    globalThis.IntersectionObserver = class {
      constructor(callback: Report) {
        report = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    const context = { clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} };
    getContext = vi.fn(() => context);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      getContext as unknown as HTMLCanvasElement['getContext']
    );
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0);
  });

  afterEach(() => vi.restoreAllMocks());

  it('follows the newest visibility report when several arrive at once', () => {
    render(<WeatherEffects condition="rainy" />);
    expect(getContext).toHaveBeenCalledTimes(1);

    act(() => report([{ isIntersecting: true }, { isIntersecting: false }]));
    act(() => report([{ isIntersecting: false }, { isIntersecting: true }]));

    expect(getContext).toHaveBeenCalledTimes(2);
  });
});
