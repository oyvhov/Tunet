import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getEffectiveGridColumnsForWidth, useResponsiveGrid } from '../hooks/useResponsiveGrid';
import { MOBILE_BREAKPOINT } from '../config/constants';

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
  it('returns full gridColumns at ≥1024px', () => {
    fireResize(1440);
    const { result } = renderHook(() => useResponsiveGrid(5));
    expect(result.current.gridColCount).toBe(5);
  });

  it('caps at 4 for 768–1023px range', () => {
    fireResize(900);
    const { result } = renderHook(() => useResponsiveGrid(5));
    expect(result.current.gridColCount).toBe(4);
  });

  it('returns min(gridColumns, 4) when gridColumns < 4 in 768–1023px range', () => {
    fireResize(900);
    const { result } = renderHook(() => useResponsiveGrid(2));
    expect(result.current.gridColCount).toBe(2);
  });

  it('caps at 3 for 480–767px range', () => {
    fireResize(700);
    const { result } = renderHook(() => useResponsiveGrid(5));
    expect(result.current.gridColCount).toBe(3);
  });

  it('caps at 2 below 480px', () => {
    fireResize(420);
    const { result } = renderHook(() => useResponsiveGrid(5));
    expect(result.current.gridColCount).toBe(2);
  });

  it('updates on resize', () => {
    fireResize(1440);
    const { result } = renderHook(() => useResponsiveGrid(4));
    expect(result.current.gridColCount).toBe(4);

    act(() => fireResize(700));
    expect(result.current.gridColCount).toBe(3);
  });
});

describe('useResponsiveGrid › dynamic columns mode', () => {
  it('reports the same effective mobile column count used by the settings menu', () => {
    expect(getEffectiveGridColumnsForWidth(390, 2, true)).toBe(2);
    expect(getEffectiveGridColumnsForWidth(390, 2, false)).toBe(2);
    expect(getEffectiveGridColumnsForWidth(390, 1, true)).toBe(1);
  });

  it('pairs small cards on a phone in auto mode instead of stacking every card', () => {
    fireResize(390);
    const { result } = renderHook(() => useResponsiveGrid(4, true));
    expect(result.current.gridColCount).toBe(2);
  });

  it('reduces 4 selected columns to 3 around tablet portrait widths', () => {
    fireResize(820);
    const { result } = renderHook(() => useResponsiveGrid(4, true));
    expect(result.current.gridColCount).toBe(3);
  });

  it('keeps 4 selected columns on wider tablet/desktop widths', () => {
    fireResize(1200);
    const { result } = renderHook(() => useResponsiveGrid(4, true));
    expect(result.current.gridColCount).toBe(4);
  });

  it('caps at 4 in auto mode even when 5 is selected on large screens', () => {
    fireResize(1440);
    const { result } = renderHook(() => useResponsiveGrid(5, true));
    expect(result.current.gridColCount).toBe(4);
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
