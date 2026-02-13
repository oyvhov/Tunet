import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveGrid } from '../hooks/useResponsiveGrid';
import { MOBILE_BREAKPOINT } from '../constants';

// ── Window resize helper ─────────────────────────────────────────────────
function fireResize(width) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

// ═════════════════════════════════════════════════════════════════════════
// Column count at different breakpoints
// ═════════════════════════════════════════════════════════════════════════
describe('useResponsiveGrid › column count', () => {
  it('returns full gridColumns at ≥1280px', () => {
    fireResize(1440);
    const { result } = renderHook(() => useResponsiveGrid(5));
    expect(result.current.gridColCount).toBe(5);
  });

  it('caps at 3 for 1024–1279px range', () => {
    fireResize(1100);
    const { result } = renderHook(() => useResponsiveGrid(5));
    expect(result.current.gridColCount).toBe(3);
  });

  it('returns min(gridColumns, 3) when gridColumns < 3 in mid range', () => {
    fireResize(1100);
    const { result } = renderHook(() => useResponsiveGrid(2));
    expect(result.current.gridColCount).toBe(2);
  });

  it('returns 2 for <1024px', () => {
    fireResize(800);
    const { result } = renderHook(() => useResponsiveGrid(5));
    expect(result.current.gridColCount).toBe(2);
  });

  it('updates on resize', () => {
    fireResize(1440);
    const { result } = renderHook(() => useResponsiveGrid(4));
    expect(result.current.gridColCount).toBe(4);

    act(() => fireResize(800));
    expect(result.current.gridColCount).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Mobile detection
// ═════════════════════════════════════════════════════════════════════════
describe('useResponsiveGrid › isMobile', () => {
  it('is true below MOBILE_BREAKPOINT', () => {
    fireResize(MOBILE_BREAKPOINT - 1);
    const { result } = renderHook(() => useResponsiveGrid(4));
    expect(result.current.isMobile).toBe(true);
  });

  it('is false at MOBILE_BREAKPOINT', () => {
    fireResize(MOBILE_BREAKPOINT);
    const { result } = renderHook(() => useResponsiveGrid(4));
    expect(result.current.isMobile).toBe(false);
  });

  it('is false well above MOBILE_BREAKPOINT', () => {
    fireResize(1024);
    const { result } = renderHook(() => useResponsiveGrid(4));
    expect(result.current.isMobile).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Compact cards flag
// ═════════════════════════════════════════════════════════════════════════
describe('useResponsiveGrid › isCompactCards', () => {
  it('is true in 480–639px range', () => {
    fireResize(500);
    const { result } = renderHook(() => useResponsiveGrid(4));
    expect(result.current.isCompactCards).toBe(true);
  });

  it('is false below 480px', () => {
    fireResize(400);
    const { result } = renderHook(() => useResponsiveGrid(4));
    expect(result.current.isCompactCards).toBe(false);
  });

  it('is false at 640px and above', () => {
    fireResize(640);
    const { result } = renderHook(() => useResponsiveGrid(4));
    expect(result.current.isCompactCards).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Cleanup
// ═════════════════════════════════════════════════════════════════════════
describe('useResponsiveGrid › cleanup', () => {
  it('removes resize listener on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    fireResize(1024);
    const { unmount } = renderHook(() => useResponsiveGrid(4));
    unmount();
    expect(spy).toHaveBeenCalledWith('resize', expect.any(Function));
    spy.mockRestore();
  });
});
